// 媒体对象
export type MediaItem = {
  id: string;
  title: string;
  cover: string;
  subtitle?: string;
};

// 媒体分类/栏目对象
export type MediaSection = {
  title: string;
  items: MediaItem[];
  aspectRatio: number;
};

// 剧集列表对象
export type EpisodeGroup = {
  sourceName: string;
  list: { id: string; name: string }[];
};

// 视频详情对象
export type MediaDetail = MediaItem & {
  description?: string;
  episodes: EpisodeGroup[];
};

export type HttpPlayUrlResult = {
  url: string;
  headers?: Record<string, string>;
};
