import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Video {
    id: VideoId;
    title: string;
    owner: Principal;
    description: string;
    videoBlob: ExternalBlob;
    likes: bigint;
    thumbnailBlob: ExternalBlob;
    timestamp: bigint;
}
export interface UserProfile {
    bio: string;
    displayName: string;
    profilePicBlob?: ExternalBlob;
}
export type CommentId = bigint;
export interface Comment {
    id: CommentId;
    text: string;
    author: Principal;
    timestamp: bigint;
    videoId: VideoId;
}
export interface UserWithRole {
    principal: Principal;
    role: UserRole;
    profile: UserProfile;
}
export interface Listing {
    id: ListingId;
    title: string;
    owner: Principal;
    description: string;
    isSold: boolean;
    timestamp: bigint;
    image: ExternalBlob;
    price: bigint;
}
export type ReplyId = bigint;
export interface ForumCategory {
    id: CategoryId;
    name: string;
    description: string;
    isActive: boolean;
}
export interface ThreadReply {
    id: ReplyId;
    text: string;
    author: Principal;
    timestamp: bigint;
    threadId: ThreadId;
}
export type ThreadId = bigint;
export interface ForumThread {
    id: ThreadId;
    categoryId: CategoryId;
    title: string;
    body: string;
    author: Principal;
    timestamp: bigint;
}
export type ListingId = bigint;
export type VideoId = bigint;
export type CategoryId = bigint;
export interface ThreadWithReplies {
    thread: ForumThread;
    replies: Array<ThreadReply>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
// Shops
export type ShopId = bigint;
export interface Shop {
    id: ShopId;
    name: string;
    description: string;
    bannerBlob?: ExternalBlob;
    owner: Principal;
    timestamp: bigint;
}
export type ShopProductId = bigint;
export interface ShopProduct {
    id: ShopProductId;
    shopId: ShopId;
    title: string;
    description: string;
    price: bigint;
    imageBlob?: ExternalBlob;
    timestamp: bigint;
}
// Groups
export type GroupId = bigint;
export interface Group {
    id: GroupId;
    name: string;
    description: string;
    iconBlob?: ExternalBlob;
    owner: Principal;
    timestamp: bigint;
}
export type ChannelId = bigint;
export interface GroupChannel {
    id: ChannelId;
    groupId: GroupId;
    name: string;
    description: string;
}
export type GroupMessageId = bigint;
export interface GroupMessage {
    id: GroupMessageId;
    channelId: ChannelId;
    author: Principal;
    text: string;
    timestamp: bigint;
}
export interface backendInterface {
    addComment(videoId: VideoId, text: string): Promise<CommentId>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCategory(name: string, description: string): Promise<CategoryId>;
    createListing(title: string, description: string, price: bigint, image: ExternalBlob): Promise<ListingId>;
    createThread(categoryId: CategoryId, title: string, body: string): Promise<ThreadId>;
    createVideo(title: string, description: string, videoBlob: ExternalBlob, thumbnailBlob: ExternalBlob): Promise<VideoId>;
    getAllActiveListings(): Promise<Array<Listing>>;
    getAllCategories(): Promise<Array<ForumCategory>>;
    getAllUsers(): Promise<Array<UserWithRole>>;
    getAllVideos(): Promise<Array<Video>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCommentsForVideo(videoId: VideoId): Promise<Array<Comment>>;
    getListing(id: ListingId): Promise<Listing | null>;
    getThreadWithReplies(threadId: ThreadId): Promise<ThreadWithReplies | null>;
    getThreadsInCategory(categoryId: CategoryId): Promise<Array<ForumThread>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVideo(id: VideoId): Promise<Video | null>;
    isCallerAdmin(): Promise<boolean>;
    likeVideo(id: VideoId): Promise<void>;
    markAsSold(id: ListingId): Promise<void>;
    removeUser(user: Principal): Promise<void>;
    replyToThread(threadId: ThreadId, text: string): Promise<ReplyId>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    // Shops
    createShop(name: string, description: string, bannerBlob: ExternalBlob | null): Promise<ShopId>;
    getAllShops(): Promise<Array<Shop>>;
    getShop(id: ShopId): Promise<Shop | null>;
    getShopByOwner(owner: Principal): Promise<Shop | null>;
    addShopProduct(shopId: ShopId, title: string, description: string, price: bigint, imageBlob: ExternalBlob | null): Promise<ShopProductId>;
    getShopProducts(shopId: ShopId): Promise<Array<ShopProduct>>;
    deleteShopProduct(productId: ShopProductId): Promise<void>;
    // Groups
    createGroup(name: string, description: string, iconBlob: ExternalBlob | null): Promise<GroupId>;
    getAllGroups(): Promise<Array<Group>>;
    getGroup(id: GroupId): Promise<Group | null>;
    joinGroup(groupId: GroupId): Promise<void>;
    leaveGroup(groupId: GroupId): Promise<void>;
    getGroupMembers(groupId: GroupId): Promise<Array<Principal>>;
    createGroupChannel(groupId: GroupId, name: string, description: string): Promise<ChannelId>;
    getGroupChannels(groupId: GroupId): Promise<Array<GroupChannel>>;
    postGroupMessage(channelId: ChannelId, text: string): Promise<GroupMessageId>;
    getGroupMessages(channelId: ChannelId): Promise<Array<GroupMessage>>;
}
