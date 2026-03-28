import { Principal as PrincipalClass } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalBlob } from "../backend";
import type { UserProfile } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useAllVideos() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllVideos();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useVideo(id: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["video", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getVideo(id);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useComments(videoId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["comments", videoId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCommentsForVideo(videoId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllListings() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllActiveListings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListing(id: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["listing", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getListing(id);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllCategories() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCategories();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useThreadsInCategory(categoryId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["threads", categoryId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getThreadsInCategory(categoryId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useThreadWithReplies(threadId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["thread", threadId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getThreadWithReplies(threadId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCallerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCreatorOrAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principalKey = identity?.getPrincipal().toString() ?? "anon";
  return useQuery({
    queryKey: ["isCreatorOrAdmin", principalKey],
    queryFn: async () => {
      if (!actor || !identity) return false;
      try {
        return await actor.isCallerCreatorOrAdmin();
      } catch (err) {
        console.error("isCallerCreatorOrAdmin error:", err);
        return false;
      }
    },
    enabled: !!actor && !!identity && !isFetching,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function usePublicUserProfile(
  principal: PrincipalClass | string | null | undefined,
) {
  const { actor, isFetching } = useActor();
  const key = principal?.toString();
  return useQuery({
    queryKey: ["publicProfile", key],
    queryFn: async () => {
      if (!actor || !principal) return null;
      const p =
        typeof principal === "string"
          ? PrincipalClass.fromText(principal)
          : principal;
      return actor.getUserProfile(p);
    },
    enabled: !!actor && !isFetching && !!principal,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["callerProfile"] }),
  });
}

export function useLikeVideo() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.likeVideo(id);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["video", id.toString()] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      videoId,
      text,
    }: { videoId: bigint; text: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addComment(videoId, text);
    },
    onSuccess: (_data, { videoId }) =>
      qc.invalidateQueries({ queryKey: ["comments", videoId.toString()] }),
  });
}

export function useCreateVideo() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      videoFile,
      thumbnailFile,
      onProgress,
    }: {
      title: string;
      description: string;
      videoFile: File;
      thumbnailFile: File;
      onProgress?: (pct: number) => void;
    }) => {
      if (!actor) throw new Error("Not connected");
      const [videoBytes, thumbBytes] = await Promise.all([
        videoFile.arrayBuffer().then((b) => new Uint8Array(b)),
        thumbnailFile.arrayBuffer().then((b) => new Uint8Array(b)),
      ]);
      let videoBlob = ExternalBlob.fromBytes(videoBytes);
      if (onProgress) videoBlob = videoBlob.withUploadProgress(onProgress);
      const thumbnailBlob = ExternalBlob.fromBytes(thumbBytes);
      return actor.createVideo(title, description, videoBlob, thumbnailBlob);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useCreateListing() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      price,
      imageFile,
    }: {
      title: string;
      description: string;
      price: bigint;
      imageFile: File;
    }) => {
      if (!actor) throw new Error("Not connected");
      const bytes = new Uint8Array(await imageFile.arrayBuffer());
      const image = ExternalBlob.fromBytes(bytes);
      return actor.createListing(title, description, price, image);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useMarkListingSold() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.markAsSold(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useCreateCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: { name: string; description: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createCategory(name, description);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useCreateThread() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      title,
      body,
    }: { categoryId: bigint; title: string; body: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createThread(categoryId, title, body);
    },
    onSuccess: (_data, { categoryId }) =>
      qc.invalidateQueries({ queryKey: ["threads", categoryId.toString()] }),
  });
}

export function useReplyToThread() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      text,
    }: { threadId: bigint; text: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.replyToThread(threadId, text);
    },
    onSuccess: (_data, { threadId }) =>
      qc.invalidateQueries({ queryKey: ["thread", threadId.toString()] }),
  });
}

export function useAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAssignRole() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, role }: { user: any; role: any }) => {
      if (!actor) throw new Error("Not connected");
      return actor.assignCallerUserRole(user, role);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allUsers"] }),
  });
}

export function useRemoveUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: any) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeUser(user);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allUsers"] }),
  });
}

// ============ SHOPS ============

export function useAllShops() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shops"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllShops();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useShop(id: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shop", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getShop(id);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useShopByOwner(owner: any) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shopByOwner", owner?.toString()],
    queryFn: async () => {
      if (!actor || !owner) return null;
      return actor.getShopsByOwner(owner);
    },
    enabled: !!actor && !isFetching && !!owner,
  });
}

export function useShopProducts(shopId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shopProducts", shopId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getShopProducts(shopId);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useShopQuestions(shopId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shopQuestions", shopId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getShopQuestions(shopId);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useCreateShop() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      rules,
      contactInfo,
      bannerFile,
      isNsfw,
      categories,
    }: {
      name: string;
      description: string;
      rules: string;
      contactInfo: string;
      bannerFile: File | null;
      isNsfw: boolean;
      categories: string[];
    }) => {
      if (!actor) throw new Error("Not connected");
      let bannerBlob: ExternalBlob | null = null;
      if (bannerFile) {
        const bytes = new Uint8Array(await bannerFile.arrayBuffer());
        bannerBlob = ExternalBlob.fromBytes(bytes);
      }
      return actor.createShop(
        name,
        description,
        rules,
        contactInfo,
        isNsfw,
        categories,
        bannerBlob,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops"] }),
  });
}

export function useAddShopProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shopId,
      title,
      description,
      price,
      currency,
      imageFiles,
      paymentLink,
      stock,
      isDigital,
      category,
      digitalFile,
    }: {
      shopId: bigint;
      title: string;
      description: string;
      price: bigint;
      currency: string;
      imageFiles: File[];
      paymentLink: string;
      stock: bigint;
      isDigital: boolean;
      category: string;
      digitalFile?: File | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      const imageBlobs = await Promise.all(
        imageFiles.map((f) =>
          f
            .arrayBuffer()
            .then((b) => ExternalBlob.fromBytes(new Uint8Array(b))),
        ),
      );
      let digitalFileBlob: ExternalBlob | null = null;
      if (digitalFile) {
        digitalFileBlob = ExternalBlob.fromBytes(
          new Uint8Array(await digitalFile.arrayBuffer()),
        );
      }
      return actor.addShopProduct(
        shopId,
        title,
        description,
        price,
        currency,
        imageBlobs,
        paymentLink,
        stock,
        isDigital,
        category,
        digitalFileBlob,
      );
    },
    onSuccess: (_data, { shopId }) =>
      qc.invalidateQueries({ queryKey: ["shopProducts", shopId.toString()] }),
  });
}

export function useDeleteShop() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shopId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteShop(shopId);
    },
    onSuccess: (_data, shopId) => {
      qc.invalidateQueries({ queryKey: ["shops"] });
      qc.invalidateQueries({ queryKey: ["shop", shopId.toString()] });
    },
  });
}

export function useDeleteShopProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      shopId: _shopId,
    }: { productId: bigint; shopId: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteShopProduct(productId);
    },
    onSuccess: (_data, { shopId }) =>
      qc.invalidateQueries({ queryKey: ["shopProducts", shopId.toString()] }),
  });
}

export function useAskShopQuestion() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shopId,
      question,
    }: { shopId: bigint; question: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.askShopQuestion(shopId, question);
    },
    onSuccess: (_data, { shopId }) =>
      qc.invalidateQueries({ queryKey: ["shopQuestions", shopId.toString()] }),
  });
}

export function useAnswerShopQuestion() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questionId,
      answer,
      shopId: _shopId,
    }: { questionId: bigint; answer: string; shopId: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.answerShopQuestion(questionId, answer);
    },
    onSuccess: (_data, { shopId }) =>
      qc.invalidateQueries({ queryKey: ["shopQuestions", shopId.toString()] }),
  });
}

// ============ GROUPS ============

export function useAllGroups() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllGroups();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGroup(id: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["group", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return (actor as any).getGroup(id);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGroupMembers(groupId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["groupMembers", groupId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getGroupMembers(groupId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGroupChannels(groupId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["groupChannels", groupId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getGroupChannels(groupId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGroupMessages(channelId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["groupMessages", channelId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getGroupMessages(channelId);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useCreateGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      iconFile,
      bannerFile,
      isNsfw,
      category,
    }: {
      name: string;
      description: string;
      iconFile: File | null;
      bannerFile?: File | null;
      isNsfw: boolean;
      category: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      let iconBlob: ExternalBlob | null = null;
      if (iconFile) {
        const bytes = new Uint8Array(await iconFile.arrayBuffer());
        iconBlob = ExternalBlob.fromBytes(bytes);
      }
      let bannerBlob: ExternalBlob | null = null;
      if (bannerFile) {
        const bytes = new Uint8Array(await bannerFile.arrayBuffer());
        bannerBlob = ExternalBlob.fromBytes(bytes);
      }
      return (actor as any).createGroup(
        name,
        description,
        iconBlob,
        bannerBlob,
        isNsfw,
        category,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useJoinGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).joinGroup(groupId);
    },
    onSuccess: (_data, groupId) =>
      qc.invalidateQueries({ queryKey: ["groupMembers", groupId.toString()] }),
  });
}

export function useLeaveGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).leaveGroup(groupId);
    },
    onSuccess: (_data, groupId) =>
      qc.invalidateQueries({ queryKey: ["groupMembers", groupId.toString()] }),
  });
}

export function useCreateGroupChannel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      name,
      description,
    }: { groupId: bigint; name: string; description: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).createGroupChannel(groupId, name, description);
    },
    onSuccess: (_data, { groupId }) =>
      qc.invalidateQueries({ queryKey: ["groupChannels", groupId.toString()] }),
  });
}

export function usePostGroupMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      channelId,
      text,
      mediaFile,
      mediaType,
      mediaUrl,
    }: {
      channelId: bigint;
      text: string;
      mediaFile?: File | null;
      mediaType?: string | null;
      mediaUrl?: string | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      let mediaBlob: ExternalBlob | null = null;
      if (mediaFile) {
        const bytes = new Uint8Array(await mediaFile.arrayBuffer());
        mediaBlob = ExternalBlob.fromBytes(bytes);
      }
      const mediaBlobOpt = mediaBlob ? [mediaBlob] : [];
      const mediaTypeOpt = mediaType ? [mediaType] : [];
      const mediaUrlOpt = mediaUrl ? [mediaUrl] : [];
      return (actor as any).postGroupMessage(
        channelId,
        text,
        mediaBlobOpt,
        mediaTypeOpt,
        mediaUrlOpt,
      );
    },
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({
        queryKey: ["groupMessages", channelId.toString()],
      }),
  });
}

export function useSetChannelPermissions() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      channelId,
      restricted,
      allowedMembers,
    }: {
      channelId: bigint;
      restricted: boolean;
      allowedMembers: string[];
    }) => {
      if (!actor) throw new Error("Not connected");
      const principals = allowedMembers.map((p) => PrincipalClass.fromText(p));
      return (actor as any).setChannelPermissions(
        channelId,
        restricted,
        principals,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groupChannels"] });
    },
  });
}

export function useDeleteGroupMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId }: { messageId: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).deleteGroupMessage(messageId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groupMessages"] });
    },
  });
}

export function useAllDeletedGroupMessages() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["deletedGroupMessages"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllDeletedGroupMessages();
    },
    enabled: !!actor && !isFetching,
  });
}

// ============ SHOP UPDATE HOOKS ============

export function useUpdateShop() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shopId,
      name,
      description,
      rules,
      contactInfo,
      bannerBlob,
      logoBlob,
      isNsfw,
      categories,
    }: {
      shopId: bigint;
      name: string;
      description: string;
      rules: string;
      contactInfo: string;
      bannerBlob: ExternalBlob | null;
      logoBlob: ExternalBlob | null;
      isNsfw: boolean;
      categories: string[];
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateShop(
        shopId,
        name,
        description,
        rules,
        contactInfo,
        bannerBlob,
        logoBlob,
        isNsfw,
        categories,
      );
    },
    onSuccess: (_data, { shopId }) => {
      qc.invalidateQueries({ queryKey: ["shops"] });
      qc.invalidateQueries({ queryKey: ["shop", shopId.toString()] });
      qc.invalidateQueries({ queryKey: ["shopByOwner"] });
    },
  });
}

export function useUpdateShopProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      shopId: _shopId2,
      title,
      description,
      price,
      currency,
      imageBlobs,
      paymentLink,
      stock,
      isDigital,
      category,
      digitalFileBlob,
    }: {
      productId: bigint;
      shopId: bigint;
      title: string;
      description: string;
      price: bigint;
      currency: string;
      imageBlobs: ExternalBlob[];
      paymentLink: string;
      stock: bigint;
      isDigital: boolean;
      category: string;
      digitalFileBlob?: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateShopProduct(
        productId,
        title,
        description,
        price,
        currency,
        imageBlobs,
        paymentLink,
        stock,
        isDigital,
        category,
        digitalFileBlob ?? null,
      );
    },
    onSuccess: (_data, { shopId }) =>
      qc.invalidateQueries({ queryKey: ["shopProducts", shopId.toString()] }),
  });
}

export function useShopsByOwner(owner: any) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shopsByOwner", owner?.toString()],
    queryFn: async () => {
      if (!actor || !owner) return [];
      return actor.getShopsByOwner(owner);
    },
    enabled: !!actor && !isFetching && !!owner,
    refetchInterval: 5000,
  });
}

export function useAllShopCategories() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shopCategories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllShopCategories();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateShopCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.createShopCategory(name);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopCategories"] }),
  });
}

export function useUpdateShopCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: bigint; name: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateShopCategory(id, name);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopCategories"] }),
  });
}

export function useDeleteShopCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteShopCategory(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopCategories"] }),
  });
}

export function useDownloadRequests(shopId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["downloadRequests", shopId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDownloadRequests(shopId);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useMyDownloadRequests() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["myDownloadRequests", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyDownloadRequests();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 10000,
  });
}

export function useRequestDownload() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.requestDownload(productId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myDownloadRequests"] }),
  });
}

export function useApproveDownload() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      shopId: _shopId,
    }: { requestId: bigint; shopId: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveDownload(requestId);
    },
    onSuccess: (_d, { shopId }) => {
      qc.invalidateQueries({
        queryKey: ["downloadRequests", shopId.toString()],
      });
    },
  });
}

export function useRejectDownload() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      shopId: _shopId2,
    }: { requestId: bigint; shopId: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.rejectDownload(requestId);
    },
    onSuccess: (_d, { shopId }) => {
      qc.invalidateQueries({
        queryKey: ["downloadRequests", shopId.toString()],
      });
    },
  });
}

// ---- Shop reviews, bans, alerts, purchases ----

export interface ShopReview {
  id: bigint;
  shopId: bigint;
  reviewer: { toString(): string };
  rating: bigint;
  comment: string;
  timestamp: bigint;
}

export interface PurchaseRecord {
  id: bigint;
  productId: bigint;
  shopId: bigint;
  buyer: { toString(): string };
  productTitle: string;
  price: bigint;
  currency: string;
  timestamp: bigint;
}

export interface SellerAlert {
  id: bigint;
  shopId: bigint;
  alertType: { purchase: null } | { downloadRequest: null };
  message: string;
  buyerPrincipal: { toString(): string };
  relatedId: bigint;
  timestamp: bigint;
  isRead: boolean;
}

export function useShopReviews(shopId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<ShopReview[]>({
    queryKey: ["shopReviews", shopId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (await (actor as any).getShopReviews(shopId)) ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMyShopReview(shopId: bigint) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<ShopReview | null>({
    queryKey: [
      "myShopReview",
      shopId.toString(),
      identity?.getPrincipal().toString(),
    ],
    queryFn: async () => {
      if (!actor || !identity) return null;
      try {
        return (await (actor as any).getMyShopReview(shopId)) ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useAddShopReview() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shopId,
      rating,
      comment,
    }: { shopId: bigint; rating: bigint; comment: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).addShopReview(shopId, rating, comment);
    },
    onSuccess: (_d: any, { shopId }: any) => {
      qc.invalidateQueries({ queryKey: ["shopReviews", shopId.toString()] });
      qc.invalidateQueries({ queryKey: ["myShopReview", shopId.toString()] });
      qc.invalidateQueries({ queryKey: ["myReviews"] });
    },
  });
}

export function useIsUserBanned(
  shopId: bigint,
  user: { toString(): string } | null,
) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isUserBanned", shopId.toString(), user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return false;
      try {
        return (
          (await (actor as any).isUserBannedFromShop(shopId, user)) ?? false
        );
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useBanUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shopId,
      principalStr,
    }: { shopId: bigint; principalStr: string }) => {
      if (!actor) throw new Error("Not connected");
      const principal = PrincipalClass.fromText(principalStr);
      return (actor as any).banUserFromShop(shopId, principal);
    },
    onSuccess: (_d: any, { shopId }: any) => {
      qc.invalidateQueries({ queryKey: ["shopBans", shopId.toString()] });
    },
  });
}

export function useUnbanUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shopId,
      principal,
    }: { shopId: bigint; principal: { toString(): string } }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).unbanUserFromShop(shopId, principal);
    },
    onSuccess: (_d: any, { shopId }: any) => {
      qc.invalidateQueries({ queryKey: ["shopBans", shopId.toString()] });
    },
  });
}

export function useShopBans(shopId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<{ toString(): string }[]>({
    queryKey: ["shopBans", shopId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (await (actor as any).getShopBans(shopId)) ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSellerAlerts(shopId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<SellerAlert[]>({
    queryKey: ["sellerAlerts", shopId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (await (actor as any).getSellerAlerts(shopId)) ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

export function useMarkAlertRead() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).markAlertRead(alertId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sellerAlerts"] });
    },
  });
}

export function useDismissAlert() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).dismissAlert(alertId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sellerAlerts"] });
    },
  });
}

export function useMarkAllAlertsRead() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shopId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).markAllAlertsRead(shopId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sellerAlerts"] });
    },
  });
}

export function useMyPurchases() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<PurchaseRecord[]>({
    queryKey: ["myPurchases", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      try {
        return (await (actor as any).getMyPurchases()) ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useMyReviews() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<ShopReview[]>({
    queryKey: ["myReviews", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      try {
        return (await (actor as any).getMyReviews()) ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useRecordPurchase() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: bigint) => {
      if (!actor) throw new Error("Not connected");
      try {
        return await (actor as any).recordPurchase(productId);
      } catch {
        return null;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPurchases"] });
    },
  });
}

// ─── Group Ban & Edit hooks ────────────────────────────────────────────────

export function useUpdateGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      name,
      description,
      iconFile,
      bannerFile,
      isNsfw,
      category,
    }: {
      groupId: bigint;
      name: string;
      description: string;
      iconFile: File | null;
      bannerFile?: File | null;
      isNsfw: boolean;
      category: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      let iconBlob: ExternalBlob | null = null;
      if (iconFile) {
        const bytes = new Uint8Array(await iconFile.arrayBuffer());
        iconBlob = ExternalBlob.fromBytes(bytes);
      }
      let bannerBlob: ExternalBlob | null = null;
      if (bannerFile) {
        const bytes = new Uint8Array(await bannerFile.arrayBuffer());
        bannerBlob = ExternalBlob.fromBytes(bytes);
      }
      return (actor as any).updateGroup(
        groupId,
        name,
        description,
        iconBlob,
        bannerBlob,
        isNsfw,
        category,
      );
    },
    onSuccess: (_data, { groupId }) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group", groupId.toString()] });
    },
  });
}

export function useGroupBans(groupId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["groupBans", groupId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getGroupBans(groupId) as Promise<any[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBanUserFromGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      user,
    }: { groupId: bigint; user: string }) => {
      if (!actor) throw new Error("Not connected");
      const principal = PrincipalClass.fromText(user);
      return (actor as any).banUserFromGroup(groupId, principal);
    },
    onSuccess: (_data, { groupId }) =>
      qc.invalidateQueries({ queryKey: ["groupBans", groupId.toString()] }),
  });
}

export function useUnbanUserFromGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      user,
    }: { groupId: bigint; user: string }) => {
      if (!actor) throw new Error("Not connected");
      const principal = PrincipalClass.fromText(user);
      return (actor as any).unbanUserFromGroup(groupId, principal);
    },
    onSuccess: (_data, { groupId }) =>
      qc.invalidateQueries({ queryKey: ["groupBans", groupId.toString()] }),
  });
}
