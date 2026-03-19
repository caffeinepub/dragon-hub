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
import Migration "migration";

(with migration = Migration.run)
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

  // Claim admin access -- only works when no admin exists yet
  public shared ({ caller }) func claimFirstAdmin() : async Bool {
    if (caller.isAnonymous()) { return false };
    if (accessControlState.adminAssigned) { return false };
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

  type Group = {
    id : GroupId;
    name : Text;
    description : Text;
    iconBlob : ?Storage.ExternalBlob;
    owner : Principal;
    timestamp : Int;
  };

  let groups = Map.empty<GroupId, Group>();

  type ChannelId = Nat;
  var nextChannelId = 0;

  type GroupChannel = {
    id : ChannelId;
    groupId : GroupId;
    name : Text;
    description : Text;
  };

  let groupChannels = Map.empty<ChannelId, GroupChannel>();

  type GroupMessageId = Nat;
  var nextGroupMessageId = 0;

  type GroupMessage = {
    id : GroupMessageId;
    channelId : ChannelId;
    author : Principal;
    text : Text;
    timestamp : Int;
  };

  let groupMessages = Map.empty<GroupMessageId, GroupMessage>();

  let groupMembers = Map.empty<GroupId, List.List<Principal>>();

  // Group creation (registered users only)
  public shared ({ caller }) func createGroup(name : Text, description : Text, iconBlob : ?Storage.ExternalBlob) : async GroupId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can create groups");
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
    };
    groups.add(id, group);
    let members = List.empty<Principal>();
    members.add(caller);
    groupMembers.add(id, members);
    id;
  };

  public query func getAllGroups() : async [Group] {
    groups.values().toArray();
  };

  public query func getGroup(id : GroupId) : async ?Group {
    groups.get(id);
  };

  public shared ({ caller }) func joinGroup(groupId : GroupId) : async () {
    if (not groups.containsKey(groupId)) { Runtime.trap("Group not found") };
    switch (groupMembers.get(groupId)) {
      case (null) {
        let members = List.empty<Principal>();
        members.add(caller);
        groupMembers.add(groupId, members);
      };
      case (?members) {
        let alreadyMember = members.toArray().filter(func(p) { p == caller }).size() > 0;
        if (not alreadyMember) { members.add(caller) };
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

  public query func getGroupChannels(groupId : GroupId) : async [GroupChannel] {
    groupChannels.values().toArray().filter(
      func(c) { c.groupId == groupId }
    );
  };

  // Message posting (registered users only)
  public shared ({ caller }) func postGroupMessage(channelId : ChannelId, text : Text) : async GroupMessageId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can post messages");
    };
    if (not groupChannels.containsKey(channelId)) { Runtime.trap("Channel not found") };
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
    id;
  };

  public query func getGroupMessages(channelId : ChannelId) : async [GroupMessage] {
    groupMessages.values().toArray().filter(
      func(m) { m.channelId == channelId }
    );
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
