import { useHypeStore } from "@/modules/hype/store/hypeStore";

export function useHypeActions() {
  const setActiveHashtag = useHypeStore((state) => state.setActiveHashtag);
  const createPost = useHypeStore((state) => state.createPost);
  const toggleHype = useHypeStore((state) => state.toggleHype);
  const addComment = useHypeStore((state) => state.addComment);

  return {
    setActiveHashtag,
    createPost,
    toggleHype,
    addComment
  };
}
