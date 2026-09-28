export type ImagesExhibition = {
  heroSection: {
    mainHead: string;
    mainHead_ar: string;
    subHead: string;
    subHead_ar: string;
  };
  imagesNumber: number;
  images: {
    imageLink: string;
    title: string;
    subTitle: string;
    title_ar: string;
    subTitle_ar: string;
    date: string;
  }[];
  moreImages: {
    imageLink: string;
    title: string;
    subTitle: string;
    title_ar: string;
    subTitle_ar: string;
    date: string;
  }[];
};
