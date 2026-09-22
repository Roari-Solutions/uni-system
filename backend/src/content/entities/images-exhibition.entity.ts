export type ImagesExhibition = {
  heroSection: {
    mainHead: string;
    subHead: string;
  };
  imagesNumber: number;
  images: { imageLink: string; title: string; subTitle: string; date: string }[];
  moreImages: { imageLink: string; title: string; subTitle: string; date: string }[];
};
