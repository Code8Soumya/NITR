import { type HypePost } from "@/modules/hype/types";

const now = new Date();

const minutesAgo = (minutes: number) => {
  const date = new Date(now.getTime() - minutes * 60 * 1000);
  return date.toISOString();
};

export const initialFeed: HypePost[] = [
  {
    id: "post-1",
    userId: "user-201",
    authorName: "Aarav N.",
    authorBranch: "ECE",
    authorBio: "Sunsets, circuits, and late-night chai runs.",
    caption:
      "Sunset from SAC roof. NITR evenings are undefeated. #NITRLife #CampusMood #Sunset",
    hashtags: ["#NITRLife", "#CampusMood", "#Sunset"],
    createdAt: minutesAgo(14),
    hypeCount: 26,
    isHypedByMe: false,
    media: [
      {
        id: "media-1",
        uri: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200",
        mediaType: "image",
        aspectRatioLabel: "16:9"
      }
    ],
    comments: [
      {
        id: "comment-1",
        postId: "post-1",
        userId: "user-89",
        displayName: "Nisha B.",
        body: "This sky was unreal yesterday.",
        createdAt: minutesAgo(11)
      }
    ]
  },
  {
    id: "post-2",
    userId: "user-145",
    authorName: "Sarthak P.",
    authorBranch: "ME",
    authorBio: "Building robots and shipping demos every week.",
    caption:
      "Robotics club sprint in progress. Demo tomorrow. #BuildInPublic #NITRTech",
    hashtags: ["#BuildInPublic", "#NITRTech"],
    createdAt: minutesAgo(46),
    hypeCount: 17,
    isHypedByMe: true,
    media: [
      {
        id: "media-2",
        uri: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
        mediaType: "video",
        aspectRatioLabel: "16:9"
      }
    ],
    comments: []
  },
  {
    id: "post-3",
    userId: "user-300",
    authorName: "Prerna K.",
    authorBranch: "CSE",
    authorBio: "Competitive coder, library regular, coffee loyalist.",
    caption: "Midsem prep grind check. Library seats filling fast. #ExamMode",
    hashtags: ["#ExamMode"],
    createdAt: minutesAgo(120),
    hypeCount: 11,
    isHypedByMe: false,
    media: [],
    comments: [
      {
        id: "comment-2",
        postId: "post-3",
        userId: "user-63",
        displayName: "Ritik M.",
        body: "Need this discipline.",
        createdAt: minutesAgo(110)
      }
    ]
  }
];
