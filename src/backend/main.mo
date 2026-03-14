import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  // Mixin Authorization and Storage
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // User Profiles
  type UserProfile = {
    displayName : Text;
    bio : Text;
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
    userProfiles.get(user);
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

  public query ({ caller }) func getAllVideos() : async [Video] {
    videos.values().toArray().sort(Video.compareByTimestamp);
  };

  public query ({ caller }) func getVideo(id : VideoId) : async ?Video {
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

  public query ({ caller }) func getCommentsForVideo(videoId : VideoId) : async [Comment] {
    comments.values().toArray().filter(
      func(c) {
        c.videoId == videoId;
      }
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

  public query ({ caller }) func getAllActiveListings() : async [Listing] {
    listings.values().toArray().filter(
      func(l) { not l.isSold }
    ).sort(Listing.compareByTimestamp);
  };

  public query ({ caller }) func getListing(id : ListingId) : async ?Listing {
    listings.get(id);
  };

  public shared ({ caller }) func markAsSold(id : ListingId) : async () {
    switch (listings.get(id)) {
      case (null) {
        Runtime.trap("Listing not found");
      };
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
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can create categories");
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

  public query ({ caller }) func getAllCategories() : async [ForumCategory] {
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

  public query ({ caller }) func getThreadsInCategory(categoryId : CategoryId) : async [ForumThread] {
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

  public query ({ caller }) func getThreadWithReplies(threadId : ThreadId) : async ?ThreadWithReplies {
    switch (threads.get(threadId)) {
      case (null) { null };
      case (?thread) {
        let threadReplies = replies.values().toArray().filter(
          func(r) { r.threadId == threadId }
        );
        ?{
          thread;
          replies = threadReplies;
        };
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
};
