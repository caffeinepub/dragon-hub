import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // Separate stable Map for creator role -- avoids UserRole type migration
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

  // Admin can grant/revoke creator status
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

  // User Profiles
  type UserProfile = {
    displayName : Text;
    bio : Text;
    profilePicBlob : ?Storage.ExternalBlob;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
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

  // Public profile lookup (display name + avatar only, for showing in comments/posts)
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
    let usersWithRoles = List.empty<UserWithRole>();
    userProfiles.entries().forEach(
      func((user, profile)) {
        let role = AccessControl.getUserRole(accessControlState, user);
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
  };

  // Videos
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

  module Video {
    public func compareByTimestamp(v1 : Video, v2 : Video) : Order.Order {
      Int.compare(v2.timestamp, v1.timestamp);
    };
  };

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

  public shared ({ caller }) func createVideo(title : Text, description : Text, videoBlob : Storage.ExternalBlob, thumbnailBlob : Storage.ExternalBlob) : async VideoId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create videos");
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
    videos.values().toArray().sort(Video.compareByTimestamp);
  };

  public query func getVideo(id : VideoId) : async ?Video {
    videos.get(id);
  };

  public shared ({ caller }) func likeVideo(id : VideoId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like videos");
    };
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
      Runtime.trap("Unauthorized: Only users can add comments");
    };
    if (not videos.containsKey(videoId)) {
      Runtime.trap("Video not found");
    };
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

  module Listing {
    public func compareByTimestamp(l1 : Listing, l2 : Listing) : Order.Order {
      Int.compare(l2.timestamp, l1.timestamp);
    };
  };

  public shared ({ caller }) func createListing(title : Text, description : Text, price : Nat, image : Storage.ExternalBlob) : async ListingId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create listings");
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
    ).sort(Listing.compareByTimestamp);
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
    if (not isCreatorOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or creators can create categories");
    };
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

  module ForumThread {
    public func compareByTimestamp(t1 : ForumThread, t2 : ForumThread) : Order.Order {
      Int.compare(t2.timestamp, t1.timestamp);
    };
  };

  public shared ({ caller }) func createThread(categoryId : CategoryId, title : Text, body : Text) : async ThreadId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create threads");
    };
    if (not categories.containsKey(categoryId)) {
      Runtime.trap("Category not found");
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
    ).sort(ForumThread.compareByTimestamp);
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
      Runtime.trap("Unauthorized: Only users can reply to threads");
    };
    if (not threads.containsKey(threadId)) {
      Runtime.trap("Thread not found");
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

  // Shops
  type ShopId = Nat;
  var nextShopId = 0;

  type Shop = {
    id : ShopId;
    name : Text;
    description : Text;
    bannerBlob : ?Storage.ExternalBlob;
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
    imageBlob : ?Storage.ExternalBlob;
    timestamp : Int;
  };

  let shopProducts = Map.empty<ShopProductId, ShopProduct>();

  public shared ({ caller }) func createShop(name : Text, description : Text, bannerBlob : ?Storage.ExternalBlob) : async ShopId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create shops");
    };
    let id = nextShopId;
    nextShopId += 1;
    let shop : Shop = {
      id;
      name;
      description;
      bannerBlob;
      owner = caller;
      timestamp = Time.now();
    };
    shops.add(id, shop);
    id;
  };

  public query func getAllShops() : async [Shop] {
    shops.values().toArray();
  };

  public query func getShop(id : ShopId) : async ?Shop {
    shops.get(id);
  };

  public query func getShopByOwner(owner : Principal) : async ?Shop {
    var found : ?Shop = null;
    shops.values().forEach(func(s) {
      if (s.owner == owner) { found := ?s };
    });
    found;
  };

  public shared ({ caller }) func addShopProduct(shopId : ShopId, title : Text, description : Text, price : Nat, imageBlob : ?Storage.ExternalBlob) : async ShopProductId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
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
      imageBlob;
      timestamp = Time.now();
    };
    shopProducts.add(id, product);
    id;
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

  public shared ({ caller }) func createGroup(name : Text, description : Text, iconBlob : ?Storage.ExternalBlob) : async GroupId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
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
      case (null) {};
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Only group owner or admin can create channels");
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

  public shared ({ caller }) func postGroupMessage(channelId : ChannelId, text : Text) : async GroupMessageId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
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
};
