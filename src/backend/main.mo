import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Blob "mo:core/Blob";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";



actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // Creator role management
  let creatorPrincipals = Map.empty<Principal, Bool>();

  func isCreator(p : Principal) : Bool {
    switch (creatorPrincipals.get(p)) {
      case (?true) { true };
      case (_) { false };
    };
  };

  func isCreatorOrAdmin(p : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, p) or isCreator(p);
  };

  // Check if any admin exists (scans actual role map, ignores stale flag)
  func anyAdminExists() : Bool {
    for ((_, role) in accessControlState.userRoles.entries()) {
      if (role == #admin) { return true };
    };
    false;
  };

  // Expose to frontend so UI can decide whether to show claim button
  public query func hasAdminBeenClaimed() : async Bool {
    anyAdminExists();
  };

  // Claim admin access -- only works when no admin actually exists
  public shared ({ caller }) func claimFirstAdmin() : async Bool {
    if (caller.isAnonymous()) { return false };
    if (anyAdminExists()) { return false };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    return true;
  };

  // Admins can grant/revoke creator role
  public shared ({ caller }) func setCreatorStatus(user : Principal, status : Bool) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can set creator status");
    };
    if (status) {
      creatorPrincipals.add(user, true);
      // Ensure user is registered in userRoles so backend calls don't trap
      switch (accessControlState.userRoles.get(user)) {
        case (null) { accessControlState.userRoles.add(user, #user) };
        case (?_) {};
      };
    } else {
      creatorPrincipals.remove(user);
    };
  };

  // Check if caller is admin or creator (safe - no trap for unregistered users)
  public query ({ caller }) func isCallerCreatorOrAdmin() : async Bool {
    if (caller.isAnonymous()) { return false };
    let isAdm = switch (accessControlState.userRoles.get(caller)) {
      case (?r) { r == #admin };
      case (_) { false };
    };
    isAdm or isCreator(caller);
  };

  // Register caller as regular user (safe to call even if already registered)
  public shared ({ caller }) func registerCallerAsUser() : async () {
    if (caller.isAnonymous()) { return };
    switch (accessControlState.userRoles.get(caller)) {
      case (?_) {}; // already registered, do nothing
      case (null) {
        accessControlState.userRoles.add(caller, #user);
      };
    };
  };

  // User Profiles
  type UserProfile = {
    displayName : Text;
    bio : Text;
    profilePicBlob : ?Storage.ExternalBlob;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) { return null };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  // Public profile lookup (display name + avatar only, for comments/posts)
  public query func getPublicUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  type UserWithRole = {
    principal : Principal;
    profile : UserProfile;
    role : AccessControl.UserRole;
    isCreator : Bool;
  };

  public query ({ caller }) func getAllUsers() : async [UserWithRole] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can get all users");
    };
    let allPrincipals = Map.empty<Principal, Bool>();
    accessControlState.userRoles.entries().forEach(func((p, _)) { allPrincipals.add(p, true) });
    creatorPrincipals.entries().forEach(func((p, _)) { allPrincipals.add(p, true) });
    let usersWithRoles = List.empty<UserWithRole>();
    allPrincipals.entries().forEach(
      func((user, _)) {
        let profile = switch (userProfiles.get(user)) {
          case (?p) { p };
          case (null) { { displayName = ""; bio = ""; profilePicBlob = null } };
        };
        let role = switch (accessControlState.userRoles.get(user)) {
          case (?r) { r };
          case (null) { #guest };
        };
        let userWithRole : UserWithRole = {
          principal = user;
          profile;
          role;
          isCreator = isCreator(user);
        };
        usersWithRoles.add(userWithRole);
      }
    );
    usersWithRoles.toArray();
  };

  public shared ({ caller }) func removeUser(user : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can remove users");
    };
    userProfiles.remove(user);
    creatorPrincipals.remove(user);
    accessControlState.userRoles.remove(user);
  };

  // Shop Categories
  var nextShopCategoryId = 0;
  type ShopCategory = {
    id : Nat;
    name : Text;
    isActive : Bool;
  };
  let shopCategories = Map.empty<Nat, ShopCategory>();

  public shared ({ caller }) func createShopCategory(name : Text) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create shop categories");
    };
    let id = nextShopCategoryId;
    nextShopCategoryId += 1;
    shopCategories.add(
      id,
      {
        id;
        name;
        isActive = true;
      },
    );
    id;
  };

  public shared ({ caller }) func updateShopCategory(id : Nat, name : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update shop categories");
    };
    switch (shopCategories.get(id)) {
      case (null) { Runtime.trap("Category not found") };
      case (?category) {
        shopCategories.add(id, { category with name });
      };
    };
  };

  public shared ({ caller }) func deleteShopCategory(id : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete shop categories");
    };
    switch (shopCategories.get(id)) {
      case (null) { Runtime.trap("Category not found") };
      case (?category) {
        shopCategories.add(id, { category with isActive = false });
      };
    };
  };

  public query func getAllShopCategories() : async [ShopCategory] {
    shopCategories.values().toArray().filter(
      func(c) { c.isActive }
    );
  };

  // Video Sharing
  type VideoId = Nat;
  var nextVideoId = 0;

  type Video = {
    id : VideoId;
    title : Text;
    description : Text;
    videoBlob : Storage.ExternalBlob;
    thumbnailBlob : Storage.ExternalBlob;
    owner : Principal;
    timestamp : Int;
    likes : Nat;
  };

  let videos = Map.empty<VideoId, Video>();

  type CommentId = Nat;
  var nextCommentId = 0;

  type Comment = {
    id : CommentId;
    videoId : VideoId;
    author : Principal;
    text : Text;
    timestamp : Int;
  };

  let comments = Map.empty<CommentId, Comment>();

  // Video upload (registered users only)
  public shared ({ caller }) func createVideo(title : Text, description : Text, videoBlob : Storage.ExternalBlob, thumbnailBlob : Storage.ExternalBlob) : async VideoId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can upload videos");
    };
    let id = nextVideoId;
    nextVideoId += 1;
    let video : Video = {
      id;
      title;
      description;
      videoBlob;
      thumbnailBlob;
      owner = caller;
      timestamp = Time.now();
      likes = 0;
    };
    videos.add(id, video);
    id;
  };

  public query func getAllVideos() : async [Video] {
    let videosArray = videos.values().toArray();
    if (videosArray.size() == 0) { return [] };
    videosArray;
  };

  public query func getVideo(id : VideoId) : async ?Video {
    videos.get(id);
  };

  public shared ({ caller }) func likeVideo(id : VideoId) : async () {
    switch (videos.get(id)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        let updatedVideo = {
          id = video.id;
          title = video.title;
          description = video.description;
          videoBlob = video.videoBlob;
          thumbnailBlob = video.thumbnailBlob;
          owner = video.owner;
          timestamp = video.timestamp;
          likes = video.likes + 1;
        };
        videos.add(id, updatedVideo);
      };
    };
  };

  public shared ({ caller }) func addComment(videoId : VideoId, text : Text) : async CommentId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can comment");
    };
    if (not videos.containsKey(videoId)) { Runtime.trap("Video not found") };
    let id = nextCommentId;
    nextCommentId += 1;
    let comment : Comment = {
      id;
      videoId;
      author = caller;
      text;
      timestamp = Time.now();
    };
    comments.add(id, comment);
    id;
  };

  public query func getCommentsForVideo(videoId : VideoId) : async [Comment] {
    comments.values().toArray().filter(
      func(c) { c.videoId == videoId }
    );
  };

  // Marketplace Listings
  type ListingId = Nat;
  var nextListingId = 0;

  type Listing = {
    id : ListingId;
    title : Text;
    description : Text;
    price : Nat;
    image : Storage.ExternalBlob;
    owner : Principal;
    timestamp : Int;
    isSold : Bool;
  };

  let listings = Map.empty<ListingId, Listing>();

  // Registered users only
  public shared ({ caller }) func createListing(title : Text, description : Text, price : Nat, image : Storage.ExternalBlob) : async ListingId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can create listings");
    };
    let id = nextListingId;
    nextListingId += 1;
    let listing : Listing = {
      id;
      title;
      description;
      price;
      image;
      owner = caller;
      timestamp = Time.now();
      isSold = false;
    };
    listings.add(id, listing);
    id;
  };

  public query func getAllActiveListings() : async [Listing] {
    listings.values().toArray().filter(
      func(l) { not l.isSold }
    );
  };

  public query func getListing(id : ListingId) : async ?Listing {
    listings.get(id);
  };

  public shared ({ caller }) func markAsSold(id : ListingId) : async () {
    switch (listings.get(id)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
        if (caller != listing.owner) {
          Runtime.trap("Only the owner can mark as sold");
        };
        let updatedListing = {
          id = listing.id;
          title = listing.title;
          description = listing.description;
          price = listing.price;
          image = listing.image;
          owner = listing.owner;
          timestamp = listing.timestamp;
          isSold = true;
        };
        listings.add(id, updatedListing);
      };
    };
  };

  // Shopping Cart (internal), no public functions
  type ShoppingCart = {
    owner : Principal;
    productIds : List.List<Nat>;
    timestamp : Int;
  };
  let shoppingCarts = Map.empty<Principal, ShoppingCart>();

  type ShoppingCartView = {
    owner : Principal;
    productIds : [Nat];
    timestamp : Int;
  };

  public shared ({ caller }) func addCartProduct(productId : Nat) : async () {
    if (caller.isAnonymous()) { Runtime.trap("Anonymous users cannot have cart") };
    var cart = switch (shoppingCarts.get(caller)) {
      case (null) {
        {
          owner = caller;
          productIds = List.empty<Nat>();
          timestamp = Time.now();
        };
      };
      case (?cart) { cart };
    };
    cart.productIds.add(productId);
    shoppingCarts.add(caller, cart);
  };

  public shared ({ caller }) func removeCartProduct(productId : Nat) : async () {
    switch (shoppingCarts.get(caller)) {
      case (null) { Runtime.trap("No cart found") };
      case (?cart) {
        let remaining = switch (cart.productIds.toArray().filter(func(id) { id != productId }).isEmpty()) {
          case (true) { List.empty<Nat>() };
          case (false) { List.fromArray<Nat>(cart.productIds.toArray().filter(func(id) { id != productId })) };
        };
        shoppingCarts.add(caller, { cart with productIds = remaining });
      };
    };
  };

  public shared ({ caller }) func clearCart() : async () {
    shoppingCarts.remove(caller);
  };

  public query ({ caller }) func getCart() : async ?ShoppingCartView {
    switch (shoppingCarts.get(caller)) {
      case (null) { null };
      case (?cart) {
        ?{
          cart with
          productIds = cart.productIds.toArray();
        };
      };
    };
  };

  // Forums
  type CategoryId = Nat;
  var nextCategoryId = 0;

  type ForumCategory = {
    id : CategoryId;
    name : Text;
    description : Text;
    isActive : Bool;
  };

  let categories = Map.empty<CategoryId, ForumCategory>();

  public shared ({ caller }) func createCategory(name : Text, description : Text) : async CategoryId {
    let id = nextCategoryId;
    nextCategoryId += 1;
    let category : ForumCategory = {
      id;
      name;
      description;
      isActive = true;
    };
    categories.add(id, category);
    id;
  };

  public query func getAllCategories() : async [ForumCategory] {
    categories.values().toArray().filter(
      func(c) { c.isActive }
    );
  };

  type ThreadId = Nat;
  var nextThreadId = 0;

  type ForumThread = {
    id : ThreadId;
    categoryId : CategoryId;
    author : Principal;
    title : Text;
    body : Text;
    timestamp : Int;
  };

  let threads = Map.empty<ThreadId, ForumThread>();

  public shared ({ caller }) func createThread(categoryId : CategoryId, title : Text, body : Text) : async ThreadId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can create threads");
    };
    let id = nextThreadId;
    nextThreadId += 1;
    let thread : ForumThread = {
      id;
      categoryId;
      author = caller;
      title;
      body;
      timestamp = Time.now();
    };
    threads.add(id, thread);
    id;
  };

  public query func getThreadsInCategory(categoryId : CategoryId) : async [ForumThread] {
    threads.values().toArray().filter(
      func(t) { t.categoryId == categoryId }
    );
  };

  type ReplyId = Nat;
  var nextReplyId = 0;

  type ThreadReply = {
    id : ReplyId;
    threadId : ThreadId;
    author : Principal;
    text : Text;
    timestamp : Int;
  };

  let replies = Map.empty<ReplyId, ThreadReply>();

  type ThreadWithReplies = {
    thread : ForumThread;
    replies : [ThreadReply];
  };

  public query func getThreadWithReplies(threadId : ThreadId) : async ?ThreadWithReplies {
    switch (threads.get(threadId)) {
      case (null) { null };
      case (?thread) {
        let threadReplies = replies.values().toArray().filter(
          func(r) { r.threadId == threadId }
        );
        ?{ thread; replies = threadReplies };
      };
    };
  };

  public shared ({ caller }) func replyToThread(threadId : ThreadId, text : Text) : async ReplyId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can reply to threads");
    };
    let id = nextReplyId;
    nextReplyId += 1;
    let reply : ThreadReply = {
      id;
      threadId;
      author = caller;
      text;
      timestamp = Time.now();
    };
    replies.add(id, reply);
    id;
  };

  // Shops & Products
  type ShopId = Nat;
  var nextShopId = 0;

  type Shop = {
    id : ShopId;
    name : Text;
    description : Text;
    rules : Text;
    contactInfo : Text;
    bannerBlob : ?Storage.ExternalBlob;
    logoBlob : ?Storage.ExternalBlob;
    isNsfw : Bool;
    categories : [Text];
    owner : Principal;
    timestamp : Int;
  };

  let shops = Map.empty<ShopId, Shop>();

  // Shop bans: shopId -> list of banned principals
  let shopBans = Map.empty<ShopId, List.List<Principal>>();

  public shared ({ caller }) func banUserFromShop(shopId : ShopId, user : Principal) : async () {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only shop owner or admin can ban users");
        };
        let bans = switch (shopBans.get(shopId)) {
          case (null) { List.empty<Principal>() };
          case (?b) { b };
        };
        let alreadyBanned = bans.toArray().filter(func(p) { p == user }).size() > 0;
        if (not alreadyBanned) { bans.add(user) };
        shopBans.add(shopId, bans);
      };
    };
  };

  public shared ({ caller }) func unbanUserFromShop(shopId : ShopId, user : Principal) : async () {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only shop owner or admin can unban users");
        };
        switch (shopBans.get(shopId)) {
          case (null) {};
          case (?bans) {
            let filtered = List.fromArray(bans.toArray().filter(func(p) { p != user }));
            shopBans.add(shopId, filtered);
          };
        };
      };
    };
  };

  public query ({ caller }) func getShopBans(shopId : ShopId) : async [Principal] {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only shop owner or admin can view bans");
        };
        switch (shopBans.get(shopId)) {
          case (null) { [] };
          case (?bans) { bans.toArray() };
        };
      };
    };
  };

  public query ({ caller }) func isUserBannedFromShop(shopId : ShopId, user : Principal) : async Bool {
    switch (shopBans.get(shopId)) {
      case (null) { false };
      case (?bans) { bans.toArray().filter(func(p) { p == user }).size() > 0 };
    };
  };

  // Shop Reviews
  type ShopReview = {
    id : Nat;
    shopId : ShopId;
    reviewer : Principal;
    rating : Nat; // 1-5
    comment : Text;
    timestamp : Int;
  };

  var nextShopReviewId = 0;
  let shopReviews = Map.empty<Nat, ShopReview>();

  public shared ({ caller }) func addShopReview(shopId : ShopId, rating : Nat, comment : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can leave reviews");
    };
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner == caller) {
          Runtime.trap("Shop owners cannot review their own shop");
        };
      };
    };
    // Remove existing review if any
    let existing = shopReviews.values().toArray().filter(
      func(r) { r.shopId == shopId and r.reviewer == caller }
    );
    for (r in existing.values()) {
      shopReviews.remove(r.id);
    };
    let id = nextShopReviewId;
    nextShopReviewId += 1;
    let review : ShopReview = {
      id;
      shopId;
      reviewer = caller;
      rating;
      comment;
      timestamp = Time.now();
    };
    shopReviews.add(id, review);
    id;
  };

  public query func getShopReviews(shopId : ShopId) : async [ShopReview] {
    shopReviews.values().toArray().filter(func(r) { r.shopId == shopId });
  };

  public query ({ caller }) func getMyShopReview(shopId : ShopId) : async ?ShopReview {
    let found = shopReviews.values().toArray().filter(
      func(r) { r.shopId == shopId and r.reviewer == caller }
    );
    if (found.size() == 0) { null } else { ?found[0] };
  };

  public query ({ caller }) func getMyReviews() : async [ShopReview] {
    shopReviews.values().toArray().filter(func(r) { r.reviewer == caller });
  };

  // Purchase History
  type PurchaseRecord = {
    id : Nat;
    productId : ShopProductId;
    shopId : ShopId;
    buyer : Principal;
    productTitle : Text;
    price : Nat;
    currency : Text;
    timestamp : Int;
  };

  var nextPurchaseId = 0;
  let purchaseRecords = Map.empty<Nat, PurchaseRecord>();

  public shared ({ caller }) func recordPurchase(productId : ShopProductId) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can record purchases");
    };
    switch (shopProducts.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        let id = nextPurchaseId;
        nextPurchaseId += 1;
        let record : PurchaseRecord = {
          id;
          productId;
          shopId = product.shopId;
          buyer = caller;
          productTitle = product.title;
          price = product.price;
          currency = product.currency;
          timestamp = Time.now();
        };
        purchaseRecords.add(id, record);
        // Create seller alert
        let alertId = nextSellerAlertId;
        nextSellerAlertId += 1;
        let alert : SellerAlert = {
          id = alertId;
          shopId = product.shopId;
          alertType = #purchase;
          message = "Someone clicked Buy Now on: " # product.title;
          buyerPrincipal = caller;
          relatedId = productId;
          timestamp = Time.now();
          isRead = false;
        };
        sellerAlerts.add(alertId, alert);
        id;
      };
    };
  };

  public query ({ caller }) func getMyPurchases() : async [PurchaseRecord] {
    purchaseRecords.values().toArray().filter(func(r) { r.buyer == caller });
  };

  public query ({ caller }) func getShopPurchases(shopId : ShopId) : async [PurchaseRecord] {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only shop owner or admin can view shop purchases");
        };
        purchaseRecords.values().toArray().filter(func(r) { r.shopId == shopId });
      };
    };
  };

  // Seller Alerts
  type SellerAlert = {
    id : Nat;
    shopId : ShopId;
    alertType : { #purchase; #downloadRequest };
    message : Text;
    buyerPrincipal : Principal;
    relatedId : Nat;
    timestamp : Int;
    isRead : Bool;
  };

  var nextSellerAlertId = 0;
  let sellerAlerts = Map.empty<Nat, SellerAlert>();

  public query ({ caller }) func getSellerAlerts(shopId : ShopId) : async [SellerAlert] {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only shop owner or admin can view alerts");
        };
        sellerAlerts.values().toArray().filter(func(a) { a.shopId == shopId });
      };
    };
  };

  public shared ({ caller }) func markAlertRead(alertId : Nat) : async () {
    switch (sellerAlerts.get(alertId)) {
      case (null) { Runtime.trap("Alert not found") };
      case (?alert) {
        switch (shops.get(alert.shopId)) {
          case (null) { Runtime.trap("Shop not found") };
          case (?shop) {
            if (shop.owner != caller) { Runtime.trap("Unauthorized") };
          };
        };
        sellerAlerts.add(alertId, { alert with isRead = true });
      };
    };
  };

  public shared ({ caller }) func dismissAlert(alertId : Nat) : async () {
    switch (sellerAlerts.get(alertId)) {
      case (null) { Runtime.trap("Alert not found") };
      case (?alert) {
        switch (shops.get(alert.shopId)) {
          case (null) { Runtime.trap("Shop not found") };
          case (?shop) {
            if (shop.owner != caller) { Runtime.trap("Unauthorized") };
          };
        };
        sellerAlerts.remove(alertId);
      };
    };
  };

  public shared ({ caller }) func markAllAlertsRead(shopId : ShopId) : async () {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller) { Runtime.trap("Unauthorized") };
        let toUpdate = sellerAlerts.values().toArray().filter(
          func(a) { a.shopId == shopId and not a.isRead }
        );
        for (alert in toUpdate.values()) {
          sellerAlerts.add(alert.id, { alert with isRead = true });
        };
      };
    };
  };

  type ShopProductId = Nat;
  var nextShopProductId = 0;

  type ShopProduct = {
    id : ShopProductId;
    shopId : ShopId;
    title : Text;
    description : Text;
    price : Nat;
    imageBlobs : [Storage.ExternalBlob];
    digitalFileBlob : ?Storage.ExternalBlob;
    currency : Text;
    paymentLink : Text;
    stock : Nat;
    isDigital : Bool;
    category : Text;
    timestamp : Int;
  };

  let shopProducts = Map.empty<ShopProductId, ShopProduct>();

  type ShopQuestion = {
    id : Nat;
    shopId : ShopId;
    asker : Principal;
    question : Text;
    answer : Text;
    answered : Bool;
    timestamp : Int;
  };

  var nextShopQuestionId = 0;
  let shopQuestions = Map.empty<Nat, ShopQuestion>();

  func canCreateShop(caller : Principal, isNsfw : Bool) : Bool {
    let existingShops = shops.values().toArray().filter(func(s) { s.owner == caller });
    if (existingShops.isEmpty()) { return true };
    if (existingShops.size() >= 2) { return false };
    for (shop in existingShops.values()) {
      if (shop.isNsfw == isNsfw) { return false };
    };
    true;
  };

  public shared ({ caller }) func createShop(name : Text, description : Text, rules : Text, contactInfo : Text, isNsfw : Bool, _shopCategories : [Text], bannerBlob : ?Storage.ExternalBlob) : async ShopId {
    if (not canCreateShop(caller, isNsfw)) {
      Runtime.trap("Cannot have more than 1 NSFW and 1 non-NSFW shop");
    };
    let id = nextShopId;
    nextShopId += 1;
    let shop : Shop = {
      id;
      name;
      description;
      rules;
      contactInfo;
      bannerBlob;
      logoBlob = null;
      isNsfw;
      categories = [];
      owner = caller;
      timestamp = Time.now();
    };
    shops.add(id, shop);
    id;
  };

  public shared ({ caller }) func updateShop(shopId : ShopId, name : Text, description : Text, rules : Text, contactInfo : Text, bannerBlob : ?Storage.ExternalBlob, logoBlob : ?Storage.ExternalBlob, isNsfw : Bool, categories : [Text]) : async () {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only shop owner or admin can update shop");
        };
        let updatedShop = {
          id = shop.id;
          name;
          description;
          rules;
          contactInfo;
          bannerBlob;
          logoBlob;
          isNsfw;
          categories;
          owner = shop.owner;
          timestamp = shop.timestamp;
        };
        shops.add(shopId, updatedShop);
      };
    };
  };

  public query func getAllShops() : async [Shop] {
    shops.values().toArray();
  };

  public query func getShop(id : ShopId) : async ?Shop {
    shops.get(id);
  };

  public query func getShopsByOwner(owner : Principal) : async [Shop] {
    shops.values().toArray().filter(func(shop) { shop.owner == owner });
  };

  public shared ({ caller }) func addShopProduct(shopId : ShopId, title : Text, description : Text, price : Nat, currency : Text, imageBlobs : [Storage.ExternalBlob], paymentLink : Text, stock : Nat, isDigital : Bool, category : Text, digitalFileBlob : ?Storage.ExternalBlob) : async ShopProductId {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller) { Runtime.trap("Only shop owner can add products") };
      };
    };
    let id = nextShopProductId;
    nextShopProductId += 1;
    let product : ShopProduct = {
      id;
      shopId;
      title;
      description;
      price;
      imageBlobs;
      digitalFileBlob;
      currency;
      paymentLink;
      stock;
      isDigital;
      category;
      timestamp = Time.now();
    };
    shopProducts.add(id, product);
    id;
  };

  public shared ({ caller }) func updateShopProduct(productId : ShopProductId, title : Text, description : Text, price : Nat, currency : Text, imageBlobs : [Storage.ExternalBlob], paymentLink : Text, stock : Nat, isDigital : Bool, category : Text, digitalFileBlob : ?Storage.ExternalBlob) : async () {
    switch (shopProducts.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        switch (shops.get(product.shopId)) {
          case (null) { Runtime.trap("Shop not found") };
          case (?shop) {
            if (shop.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Only shop owner or admin can update products");
            };
            let updatedProduct = {
              id = product.id;
              shopId = product.shopId;
              title;
              description;
              price;
              imageBlobs;
              digitalFileBlob;
              currency;
              paymentLink;
              stock;
              isDigital;
              category;
              timestamp = product.timestamp;
            };
            shopProducts.add(productId, updatedProduct);
          };
        };
      };
    };
  };

  public query func getShopProducts(shopId : ShopId) : async [ShopProduct] {
    shopProducts.values().toArray().filter(
      func(p) { p.shopId == shopId }
    );
  };

  public shared ({ caller }) func deleteShopProduct(productId : ShopProductId) : async () {
    switch (shopProducts.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        switch (shops.get(product.shopId)) {
          case (null) { Runtime.trap("Shop not found") };
          case (?shop) {
            if (shop.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Only shop owner or admin can delete products");
            };
          };
        };
        shopProducts.remove(productId);
      };
    };
  };

  public shared ({ caller }) func deleteShop(shopId : ShopId) : async () {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only shop owner or admin can delete shops");
        };
        shops.remove(shopId);
        let remainingProducts = shopProducts.filter(func(_, p) { p.shopId != shopId });
        shopProducts.clear();
        for ((k, v) in remainingProducts.entries()) {
          shopProducts.add(k, v);
        };
      };
    };
  };

  // Q&A
  public shared ({ caller }) func askShopQuestion(shopId : ShopId, question : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can ask shop questions");
    };
    if (not shops.containsKey(shopId)) { Runtime.trap("Shop not found") };
    let id = nextShopQuestionId;
    nextShopQuestionId += 1;
    let q : ShopQuestion = {
      id;
      shopId;
      asker = caller;
      question;
      answer = "";
      answered = false;
      timestamp = Time.now();
    };
    shopQuestions.add(id, q);
    id;
  };

  public shared ({ caller }) func answerShopQuestion(questionId : Nat, answer : Text) : async () {
    switch (shopQuestions.get(questionId)) {
      case (null) { Runtime.trap("Question not found") };
      case (?q) {
        switch (shops.get(q.shopId)) {
          case (null) { Runtime.trap("Shop not found") };
          case (?shop) {
            if (shop.owner != caller) {
              Runtime.trap("Only shop owner can answer questions");
            };
          };
        };
        let updatedQuestion = { q with answer; answered = true };
        shopQuestions.add(questionId, updatedQuestion);
      };
    };
  };

  public query func getShopQuestions(shopId : ShopId) : async [ShopQuestion] {
    shopQuestions.values().toArray().filter(
      func(q) { q.shopId == shopId }
    );
  };

  // Groups
  type GroupId = Nat;
  var nextGroupId = 0;

  // NOTE: Group type kept as original stable shape. bannerBlob stored separately.
  type Group = {
    id : GroupId;
    name : Text;
    description : Text;
    iconBlob : ?Storage.ExternalBlob;
    owner : Principal;
    timestamp : Int;
    isNsfw : Bool;
    category : Text;
  };

  let groups = Map.empty<GroupId, Group>();

  // Separate stable map for group banners (avoids upgrade incompatibility)
  let groupBanners = Map.empty<GroupId, Storage.ExternalBlob>();

  // View type returned to the frontend (includes bannerBlob)
  type GroupView = {
    id : GroupId;
    name : Text;
    description : Text;
    iconBlob : ?Storage.ExternalBlob;
    bannerBlob : ?Storage.ExternalBlob;
    owner : Principal;
    timestamp : Int;
    isNsfw : Bool;
    category : Text;
  };

  func toGroupView(group : Group) : GroupView {
    {
      id = group.id;
      name = group.name;
      description = group.description;
      iconBlob = group.iconBlob;
      bannerBlob = groupBanners.get(group.id);
      owner = group.owner;
      timestamp = group.timestamp;
      isNsfw = group.isNsfw;
      category = group.category;
    };
  };

  // Group bans: groupId -> list of banned principals
  let groupBans = Map.empty<GroupId, List.List<Principal>>();

  public shared ({ caller }) func banUserFromGroup(groupId : GroupId, user : Principal) : async () {
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only group owner or admin can ban users");
        };
        let bans = switch (groupBans.get(groupId)) {
          case (null) { List.empty<Principal>() };
          case (?b) { b };
        };
        let alreadyBanned = bans.toArray().filter(func(p) { p == user }).size() > 0;
        if (not alreadyBanned) { bans.add(user) };
        groupBans.add(groupId, bans);
        // Remove from members if present
        switch (groupMembers.get(groupId)) {
          case (null) {};
          case (?members) {
            let filtered = List.fromArray(members.toArray().filter(func(p) { p != user }));
            groupMembers.add(groupId, filtered);
          };
        };
      };
    };
  };

  public shared ({ caller }) func unbanUserFromGroup(groupId : GroupId, user : Principal) : async () {
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only group owner or admin can unban users");
        };
        switch (groupBans.get(groupId)) {
          case (null) {};
          case (?bans) {
            let filtered = List.fromArray(bans.toArray().filter(func(p) { p != user }));
            groupBans.add(groupId, filtered);
          };
        };
      };
    };
  };

  public query ({ caller }) func getGroupBans(groupId : GroupId) : async [Principal] {
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only group owner or admin can view bans");
        };
        switch (groupBans.get(groupId)) {
          case (null) { [] };
          case (?bans) { bans.toArray() };
        };
      };
    };
  };

  public query ({ caller }) func isUserBannedFromGroup(groupId : GroupId, user : Principal) : async Bool {
    switch (groupBans.get(groupId)) {
      case (null) { false };
      case (?bans) { bans.toArray().filter(func(p) { p == user }).size() > 0 };
    };
  };

  type ChannelId = Nat;
  var nextChannelId = 0;

  // NOTE: GroupChannel kept as original stable shape. restricted/allowedMembers stored separately.
  type GroupChannel = {
    id : ChannelId;
    groupId : GroupId;
    name : Text;
    description : Text;
  };

  let groupChannels = Map.empty<ChannelId, GroupChannel>();

  // Separate stable map for channel permissions
  type ChannelPermissions = {
    restricted : Bool;
    allowedMembers : [Principal];
  };
  let channelPermissions = Map.empty<ChannelId, ChannelPermissions>();

  // View type returned to frontend
  type GroupChannelView = {
    id : ChannelId;
    groupId : GroupId;
    name : Text;
    description : Text;
    restricted : Bool;
    allowedMembers : [Principal];
  };

  func toChannelView(ch : GroupChannel) : GroupChannelView {
    let perms = switch (channelPermissions.get(ch.id)) {
      case (null) { { restricted = false; allowedMembers = [] } };
      case (?p) { p };
    };
    {
      id = ch.id;
      groupId = ch.groupId;
      name = ch.name;
      description = ch.description;
      restricted = perms.restricted;
      allowedMembers = perms.allowedMembers;
    };
  };

  type GroupMessageId = Nat;
  var nextGroupMessageId = 0;

  // NOTE: GroupMessage kept as original stable shape. Media stored separately.
  type GroupMessage = {
    id : GroupMessageId;
    channelId : ChannelId;
    author : Principal;
    text : Text;
    timestamp : Int;
  };

  let groupMessages = Map.empty<GroupMessageId, GroupMessage>();

  // Separate stable map for message media
  type GroupMessageMedia = {
    mediaBlob : ?Storage.ExternalBlob;
    mediaType : ?Text;
    mediaUrl : ?Text;
  };
  let groupMessageMedia = Map.empty<GroupMessageId, GroupMessageMedia>();

  // View type returned to frontend
  type GroupMessageView = {
    id : GroupMessageId;
    channelId : ChannelId;
    author : Principal;
    text : Text;
    timestamp : Int;
    mediaBlob : ?Storage.ExternalBlob;
    mediaType : ?Text;
    mediaUrl : ?Text;
  };

  func toMessageView(msg : GroupMessage) : GroupMessageView {
    let media = switch (groupMessageMedia.get(msg.id)) {
      case (null) { { mediaBlob = null; mediaType = null; mediaUrl = null } };
      case (?m) { m };
    };
    {
      id = msg.id;
      channelId = msg.channelId;
      author = msg.author;
      text = msg.text;
      timestamp = msg.timestamp;
      mediaBlob = media.mediaBlob;
      mediaType = media.mediaType;
      mediaUrl = media.mediaUrl;
    };
  };

  // Deleted messages log
  type DeletedGroupMessage = {
    id : Nat;
    groupId : GroupId;
    channelId : ChannelId;
    originalMessageId : GroupMessageId;
    originalText : Text;
    originalAuthor : Principal;
    deletedBy : Principal;
    timestamp : Int;
  };

  var nextDeletedMsgId = 0;
  let deletedGroupMessages = Map.empty<Nat, DeletedGroupMessage>();

  let groupMembers = Map.empty<GroupId, List.List<Principal>>();

  // Group creation (registered users only)
  public shared ({ caller }) func createGroup(name : Text, description : Text, iconBlob : ?Storage.ExternalBlob, bannerBlob : ?Storage.ExternalBlob, isNsfw : Bool, category : Text) : async GroupId {
    if (not isCreatorOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or creators can create groups");
    };
    let id = nextGroupId;
    nextGroupId += 1;
    let group : Group = {
      id;
      name;
      description;
      iconBlob;
      owner = caller;
      timestamp = Time.now();
      isNsfw;
      category;
    };
    groups.add(id, group);
    switch (bannerBlob) {
      case (null) {};
      case (?b) { groupBanners.add(id, b) };
    };
    let members = List.empty<Principal>();
    members.add(caller);
    groupMembers.add(id, members);
    id;
  };

  public shared ({ caller }) func updateGroup(groupId : GroupId, name : Text, description : Text, iconBlob : ?Storage.ExternalBlob, bannerBlob : ?Storage.ExternalBlob, isNsfw : Bool, category : Text) : async () {
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.owner != caller) {
          Runtime.trap("Only group owner can update group");
        };
        let updatedGroup = {
          id = groupId;
          name;
          description;
          iconBlob;
          owner = group.owner;
          timestamp = group.timestamp;
          isNsfw;
          category;
        };
        groups.add(groupId, updatedGroup);
        switch (bannerBlob) {
          case (null) { groupBanners.remove(groupId) };
          case (?b) { groupBanners.add(groupId, b) };
        };
      };
    };
  };

  public query func getAllGroups() : async [GroupView] {
    groups.values().toArray().map<Group, GroupView>(toGroupView);
  };

  public query func getGroup(id : GroupId) : async ?GroupView {
    switch (groups.get(id)) {
      case (null) { null };
      case (?g) { ?toGroupView(g) };
    };
  };

  public shared ({ caller }) func joinGroup(groupId : GroupId) : async () {
    if (caller.isAnonymous()) { Runtime.trap("Anonymous users cannot join groups") };
    // Auto-register caller as user if not already in the system
    switch (accessControlState.userRoles.get(caller)) {
      case (?_) {};
      case (null) { accessControlState.userRoles.add(caller, #user) };
    };
    if (not groups.containsKey(groupId)) { Runtime.trap("Group not found") };
    switch (groupMembers.get(groupId)) {
      case (null) {
        let members = List.empty<Principal>();
        members.add(caller);
        groupMembers.add(groupId, members);
      };
      case (?members) {
        switch (groupBans.get(groupId)) {
          case (null) {
            let alreadyMember = members.toArray().filter(func(p) { p == caller }).size() > 0;
            if (not alreadyMember) { members.add(caller) };
          };
          case (?bans) {
            let alreadyMember = members.toArray().filter(func(p) { p == caller }).size() > 0;
            let banned = bans.toArray().filter(func(p) { p == caller }).size() > 0;
            if (not alreadyMember) {
              if (banned) {
                Runtime.trap("You are banned from this group");
              } else {
                members.add(caller);
              };
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func leaveGroup(groupId : GroupId) : async () {
    switch (groupMembers.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?members) {
        let filtered = List.fromArray(members.toArray().filter(func(p) { p != caller }));
        groupMembers.add(groupId, filtered);
      };
    };
  };

  public query func getGroupMembers(groupId : GroupId) : async [Principal] {
    switch (groupMembers.get(groupId)) {
      case (null) { [] };
      case (?members) { members.toArray() };
    };
  };

  public shared ({ caller }) func createGroupChannel(groupId : GroupId, name : Text, description : Text) : async ChannelId {
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.owner != caller) {
          Runtime.trap("Only group owner can create channels");
        };
      };
    };
    let id = nextChannelId;
    nextChannelId += 1;
    let channel : GroupChannel = { id; groupId; name; description };
    groupChannels.add(id, channel);
    id;
  };

  public query func getGroupChannels(groupId : GroupId) : async [GroupChannelView] {
    groupChannels.values().toArray().filter(
      func(c) { c.groupId == groupId }
    ).map<GroupChannel, GroupChannelView>(toChannelView);
  };

  // Set channel permissions (owner only)
  public shared ({ caller }) func setChannelPermissions(channelId : ChannelId, restricted : Bool, allowedMembers : [Principal]) : async () {
    switch (groupChannels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?channel) {
        switch (groups.get(channel.groupId)) {
          case (null) { Runtime.trap("Group not found") };
          case (?group) {
            if (group.owner != caller) {
              Runtime.trap("Only group owner can set channel permissions");
            };
          };
        };
        channelPermissions.add(channelId, { restricted; allowedMembers });
      };
    };
  };

  // Message posting (registered users only)
  public shared ({ caller }) func postGroupMessage(channelId : ChannelId, text : Text, mediaBlob : ?Storage.ExternalBlob, mediaType : ?Text, mediaUrl : ?Text) : async GroupMessageId {
    if (caller.isAnonymous()) { Runtime.trap("Anonymous users cannot post messages") };
    // Auto-register caller as user if not already in the system
    switch (accessControlState.userRoles.get(caller)) {
      case (?_) {};
      case (null) { accessControlState.userRoles.add(caller, #user) };
    };
    // Check that caller is a member or owner of the group containing this channel
    switch (groupChannels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?ch) {
        let isMember = switch (groupMembers.get(ch.groupId)) {
          case (null) { false };
          case (?members) { members.toArray().filter(func(p) { p == caller }).size() > 0 };
        };
        let isGroupOwner = switch (groups.get(ch.groupId)) {
          case (null) { false };
          case (?g) { g.owner == caller };
        };
        if (not isMember and not isGroupOwner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("You must be a member of this group to send messages");
        };
      };
    };
    // Check bans and channel restrictions
    switch (groupChannels.get(channelId)) {
      case (null) {};
      case (?c) {
        switch (groupBans.get(c.groupId)) {
          case (null) {};
          case (?bans) {
            let banned = bans.toArray().filter(func(p) { p == caller }).size() > 0;
            if (banned) { Runtime.trap("You are banned from this group") };
          };
        };
        switch (channelPermissions.get(channelId)) {
          case (null) {};
          case (?perms) {
            if (perms.restricted) {
              let isOwner = switch (groups.get(c.groupId)) {
                case (null) { false };
                case (?g) { g.owner == caller };
              };
              if (not isOwner) {
                let allowed = perms.allowedMembers.filter(func(p) { p == caller }).size() > 0;
                if (not allowed) { Runtime.trap("You do not have access to this channel") };
              };
            };
          };
        };
      };
    };
    let id = nextGroupMessageId;
    nextGroupMessageId += 1;
    let msg : GroupMessage = {
      id;
      channelId;
      author = caller;
      text;
      timestamp = Time.now();
    };
    groupMessages.add(id, msg);
    // Store media separately
    switch ((mediaBlob, mediaType, mediaUrl)) {
      case (null, null, null) {};
      case _ {
        groupMessageMedia.add(id, { mediaBlob; mediaType; mediaUrl });
      };
    };
    id;
  };

  public query func getGroupMessages(channelId : ChannelId) : async [GroupMessageView] {
    groupMessages.values().toArray().filter(
      func(m) { m.channelId == channelId }
    ).map<GroupMessage, GroupMessageView>(toMessageView);
  };

  // Delete a group message (group owner only) -- logs the deletion
  public shared ({ caller }) func deleteGroupMessage(messageId : GroupMessageId) : async () {
    switch (groupMessages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?msg) {
        switch (groupChannels.get(msg.channelId)) {
          case (null) { Runtime.trap("Channel not found") };
          case (?channel) {
            switch (groups.get(channel.groupId)) {
              case (null) { Runtime.trap("Group not found") };
              case (?group) {
                if (group.owner != caller) {
                  Runtime.trap("Only the group owner can delete messages");
                };
                // Log the deletion
                let logId = nextDeletedMsgId;
                nextDeletedMsgId += 1;
                let logEntry : DeletedGroupMessage = {
                  id = logId;
                  groupId = channel.groupId;
                  channelId = msg.channelId;
                  originalMessageId = messageId;
                  originalText = msg.text;
                  originalAuthor = msg.author;
                  deletedBy = caller;
                  timestamp = Time.now();
                };
                deletedGroupMessages.add(logId, logEntry);
                groupMessages.remove(messageId);
                groupMessageMedia.remove(messageId);
              };
            };
          };
        };
      };
    };
  };

  // Get deleted messages log (admin only)
  public query ({ caller }) func getDeletedGroupMessages(groupId : GroupId) : async [DeletedGroupMessage] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Only admins can view the deleted messages log");
    };
    deletedGroupMessages.values().toArray().filter(func(d) { d.groupId == groupId });
  };

  // Get all deleted messages across all groups (admin only)
  public query ({ caller }) func getAllDeletedGroupMessages() : async [DeletedGroupMessage] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Only admins can view the deleted messages log");
    };
    deletedGroupMessages.values().toArray();
  };

    // Download Requests
  type DownloadRequest = {
    id : Nat;
    productId : ShopProductId;
    shopId : ShopId;
    requester : Principal;
    status : { #pending; #approved; #rejected };
    timestamp : Int;
  };

  var nextDownloadRequestId = 0;
  let downloadRequests = Map.empty<Nat, DownloadRequest>();

  public shared ({ caller }) func requestDownload(productId : ShopProductId) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can request downloads");
    };
    switch (shopProducts.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        if (not product.isDigital) {
          Runtime.trap("Can only request downloads for digital products");
        };
        let id = nextDownloadRequestId;
        nextDownloadRequestId += 1;
        let request : DownloadRequest = {
          id;
          productId;
          shopId = product.shopId;
          requester = caller;
          status = #pending;
          timestamp = Time.now();
        };
        downloadRequests.add(id, request);
        // Create seller alert for download request
        let alertId = nextSellerAlertId;
        nextSellerAlertId += 1;
        let alert : SellerAlert = {
          id = alertId;
          shopId = product.shopId;
          alertType = #downloadRequest;
          message = "Download requested for: " # product.title;
          buyerPrincipal = caller;
          relatedId = id;
          timestamp = Time.now();
          isRead = false;
        };
        sellerAlerts.add(alertId, alert);
        id;
      };
    };
  };

  public shared ({ caller }) func approveDownload(requestId : Nat) : async () {
    switch (downloadRequests.get(requestId)) {
      case (null) { Runtime.trap("Request not found") };
      case (?request) {
        switch (shops.get(request.shopId)) {
          case (null) { Runtime.trap("Shop not found") };
          case (?shop) {
            if (shop.owner != caller) {
              Runtime.trap("Only shop owner can approve requests");
            };
          };
        };
        downloadRequests.add(requestId, { request with status = #approved });
      };
    };
  };

  public shared ({ caller }) func rejectDownload(requestId : Nat) : async () {
    switch (downloadRequests.get(requestId)) {
      case (null) { Runtime.trap("Request not found") };
      case (?request) {
        switch (shops.get(request.shopId)) {
          case (null) { Runtime.trap("Shop not found") };
          case (?shop) {
            if (shop.owner != caller) {
              Runtime.trap("Only shop owner can reject requests");
            };
          };
        };
        downloadRequests.add(requestId, { request with status = #rejected });
      };
    };
  };

  public query ({ caller }) func getDownloadRequests(shopId : ShopId) : async [DownloadRequest] {
    switch (shops.get(shopId)) {
      case (null) { Runtime.trap("Shop not found") };
      case (?shop) {
        if (shop.owner != caller) {
          Runtime.trap("Only shop owner can view requests");
        };
        downloadRequests.values().toArray().filter(func(r) { r.shopId == shopId });
      };
    };
  };

  public query ({ caller }) func getMyDownloadRequests() : async [(DownloadRequest, ?ShopProduct)] {
    switch (downloadRequests.isEmpty()) {
      case (true) { [] };
      case (false) {
        downloadRequests.values().toArray().filter(
          func(req) { req.requester == caller }
        ).map<DownloadRequest, (DownloadRequest, ?ShopProduct)>(
          func(request) {
            let product = if (request.status == #approved) {
              switch (shopProducts.get(request.productId)) {
                case (p) { p };
              };
            } else { null };
            (request, product);
          }
        );
      };
    };
  };

  // Restoration/Upgrade Testing Support
  public query ({ caller }) func getDatabaseCounts() : async {
    videos : Nat;
    listings : Nat;
    threads : Nat;
    categories : Nat;
    shops : Nat;
    shopProducts : Nat;
    shopQuestions : Nat;
    downloadRequests : Nat;
    groups : Nat;
  } {
    if (not AccessControl.isAdmin(accessControlState, caller)) { Runtime.trap("Unauthorized") };
    {
      videos = videos.values().toArray().size();
      listings = listings.values().toArray().size();
      threads = threads.values().toArray().size();
      categories = categories.values().toArray().size();
      shops = shops.values().toArray().size();
      shopProducts = shopProducts.values().toArray().size();
      shopQuestions = shopQuestions.values().toArray().size();
      downloadRequests = downloadRequests.values().toArray().size();
      groups = groups.values().toArray().size();
    };
  };
};
