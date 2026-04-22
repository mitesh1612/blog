export const SITE = {
  website: "https://mitesh1612.github.io/blog/",
  author: "Mitesh Shah",
  profile: "https://github.com/mitesh1612",
  desc: "Mitesh Shah's Developer Blog — posts on Software Development, Testing, Cloud, Machine Learning and more.",
  title: "Mitesh Shah's Blog",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 8,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true,
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/mitesh1612/blog/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "en",
  timezone: "Asia/Kolkata",
} as const;
