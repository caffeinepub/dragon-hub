import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalBlob } from "../backend";
import type { UserProfile } from "../backend.d";
import { useActor } from "./useActor";

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

export function useMarkAsSold() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.markAsSold(id);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["listing", id.toString()] });
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
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
    }: {
      categoryId: bigint;
      title: string;
      body: string;
    }) => {
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
