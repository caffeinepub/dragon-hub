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
export interface GroupMessage {
    id: GroupMessageId;
    channelId: ChannelId;
    text: string;
    author: Principal;
    timestamp: bigint;
}
export type ReplyId = bigint;
export interface ForumCategory {
    id: CategoryId;
    name: string;
    description: string;
    isActive: boolean;
}
export interface Group {
    id: GroupId;
    owner: Principal;
    name: string;
    description: string;
    iconBlob?: ExternalBlob;
    timestamp: bigint;
}
export type GroupId = bigint;
export interface ThreadReply {
    id: ReplyId;
    text: string;
    author: Principal;
    timestamp: bigint;
    threadId: ThreadId;
}
export type GroupMessageId = bigint;
export type ShopProductId = bigint;
export interface ShoppingCartView {
    productIds: Array<bigint>;
    owner: Principal;
    timestamp: bigint;
}
export type ListingId = bigint;
export interface ShopQuestion {
    id: bigint;
    asker: Principal;
    shopId: ShopId;
    question: string;
    answered: boolean;
    answer: string;
    timestamp: bigint;
}
export interface GroupChannel {
    id: ChannelId;
    name: string;
    description: string;
    groupId: GroupId;
}
export type VideoId = bigint;
export interface ShopCategory {
    id: bigint;
    name: string;
    isActive: boolean;
}
export interface Shop {
    id: ShopId;
    categories: Array<string>;
    contactInfo: string;
    bannerBlob?: ExternalBlob;
    owner: Principal;
    name: string;
    description: string;
    isNsfw: boolean;
    logoBlob?: ExternalBlob;
    timestamp: bigint;
    rules: string;
}
export interface ThreadWithReplies {
    thread: ForumThread;
    replies: Array<ThreadReply>;
}
export type ShopId = bigint;
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
    isCreator: boolean;
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
export type ChannelId = bigint;
export interface DownloadRequest {
    id: bigint;
    status: Variant_pending_approved_rejected;
    requester: Principal;
    shopId: ShopId;
    productId: ShopProductId;
    timestamp: bigint;
}
export interface ForumThread {
    id: ThreadId;
    categoryId: CategoryId;
    title: string;
    body: string;
    author: Principal;
    timestamp: bigint;
}
export type ThreadId = bigint;
export interface ShopProduct {
    id: ShopProductId;
    title: string;
    shopId: ShopId;
    description: string;
    stock: bigint;
    digitalFileBlob?: ExternalBlob;
    currency: string;
    timestamp: bigint;
    paymentLink: string;
    category: string;
    imageBlobs: Array<ExternalBlob>;
    price: bigint;
    isDigital: boolean;
}
export type CategoryId = bigint;
export interface UserProfile {
    bio: string;
    displayName: string;
    profilePicBlob?: ExternalBlob;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_pending_approved_rejected {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export interface backendInterface {
    addCartProduct(productId: bigint): Promise<void>;
    addComment(videoId: VideoId, text: string): Promise<CommentId>;
    addShopProduct(shopId: ShopId, title: string, description: string, price: bigint, currency: string, imageBlobs: Array<ExternalBlob>, paymentLink: string, stock: bigint, isDigital: boolean, category: string, digitalFileBlob: ExternalBlob | null): Promise<ShopProductId>;
    answerShopQuestion(questionId: bigint, answer: string): Promise<void>;
    approveDownload(requestId: bigint): Promise<void>;
    askShopQuestion(shopId: ShopId, question: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimFirstAdmin(): Promise<boolean>;
    clearCart(): Promise<void>;
    createCategory(name: string, description: string): Promise<CategoryId>;
    createGroup(name: string, description: string, iconBlob: ExternalBlob | null): Promise<GroupId>;
    createGroupChannel(groupId: GroupId, name: string, description: string): Promise<ChannelId>;
    createListing(title: string, description: string, price: bigint, image: ExternalBlob): Promise<ListingId>;
    createShop(name: string, description: string, rules: string, contactInfo: string, isNsfw: boolean, _shopCategories: Array<string>, bannerBlob: ExternalBlob | null): Promise<ShopId>;
    createShopCategory(name: string): Promise<bigint>;
    createThread(categoryId: CategoryId, title: string, body: string): Promise<ThreadId>;
    createVideo(title: string, description: string, videoBlob: ExternalBlob, thumbnailBlob: ExternalBlob): Promise<VideoId>;
    deleteShop(shopId: ShopId): Promise<void>;
    deleteShopCategory(id: bigint): Promise<void>;
    deleteShopProduct(productId: ShopProductId): Promise<void>;
    getAllActiveListings(): Promise<Array<Listing>>;
    getAllCategories(): Promise<Array<ForumCategory>>;
    getAllGroups(): Promise<Array<Group>>;
    getAllShopCategories(): Promise<Array<ShopCategory>>;
    getAllShops(): Promise<Array<Shop>>;
    getAllUsers(): Promise<Array<UserWithRole>>;
    getAllVideos(): Promise<Array<Video>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCart(): Promise<ShoppingCartView | null>;
    getCommentsForVideo(videoId: VideoId): Promise<Array<Comment>>;
    getDatabaseCounts(): Promise<{
        categories: bigint;
        groups: bigint;
        shopProducts: bigint;
        listings: bigint;
        downloadRequests: bigint;
        threads: bigint;
        shopQuestions: bigint;
        shops: bigint;
        videos: bigint;
    }>;
    getDownloadRequests(shopId: ShopId): Promise<Array<DownloadRequest>>;
    getGroup(id: GroupId): Promise<Group | null>;
    getGroupChannels(groupId: GroupId): Promise<Array<GroupChannel>>;
    getGroupMembers(groupId: GroupId): Promise<Array<Principal>>;
    getGroupMessages(channelId: ChannelId): Promise<Array<GroupMessage>>;
    getListing(id: ListingId): Promise<Listing | null>;
    getMyDownloadRequests(): Promise<Array<[DownloadRequest, ShopProduct | null]>>;
    getPublicUserProfile(user: Principal): Promise<UserProfile | null>;
    getShop(id: ShopId): Promise<Shop | null>;
    getShopProducts(shopId: ShopId): Promise<Array<ShopProduct>>;
    getShopQuestions(shopId: ShopId): Promise<Array<ShopQuestion>>;
    getShopsByOwner(owner: Principal): Promise<Array<Shop>>;
    getThreadWithReplies(threadId: ThreadId): Promise<ThreadWithReplies | null>;
    getThreadsInCategory(categoryId: CategoryId): Promise<Array<ForumThread>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVideo(id: VideoId): Promise<Video | null>;
    isCallerAdmin(): Promise<boolean>;
    isCallerCreatorOrAdmin(): Promise<boolean>;
    joinGroup(groupId: GroupId): Promise<void>;
    leaveGroup(groupId: GroupId): Promise<void>;
    likeVideo(id: VideoId): Promise<void>;
    markAsSold(id: ListingId): Promise<void>;
    postGroupMessage(channelId: ChannelId, text: string): Promise<GroupMessageId>;
    registerCallerAsUser(): Promise<void>;
    rejectDownload(requestId: bigint): Promise<void>;
    removeCartProduct(productId: bigint): Promise<void>;
    removeUser(user: Principal): Promise<void>;
    replyToThread(threadId: ThreadId, text: string): Promise<ReplyId>;
    requestDownload(productId: ShopProductId): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setCreatorStatus(user: Principal, status: boolean): Promise<void>;
    updateShop(shopId: ShopId, name: string, description: string, rules: string, contactInfo: string, bannerBlob: ExternalBlob | null, logoBlob: ExternalBlob | null, isNsfw: boolean, categories: Array<string>): Promise<void>;
    updateShopCategory(id: bigint, name: string): Promise<void>;
    updateShopProduct(productId: ShopProductId, title: string, description: string, price: bigint, currency: string, imageBlobs: Array<ExternalBlob>, paymentLink: string, stock: bigint, isDigital: boolean, category: string, digitalFileBlob: ExternalBlob | null): Promise<void>;
}
