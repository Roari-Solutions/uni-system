// import { useTranslation } from "react-i18next";
// import { useEffect } from "react";

const PresidentSection = () => {
  return (
    <section className="bg-[#111111] bg-opacity-95 py-24 px-6 border-y-[3px] border-[#d67528]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
        
        {/* Text Content Block */}
        <div className="flex-1 text-white">
          <h1 className="text-3xl font-bold mb-6">
            كلمة مدير الجامعة
          </h1>
          <p className="text-gray-300 leading-[2.2] text-sm md:text-base mb-8">
            بسم الله الرحمن الرحيم و به نستعين
الحمد لله الذي بنعمته تتم الصالحات
وبفضله ومنه وكرمه تقضى الحاجات
وتتنزل الرحمات ، إلى أبنائي الطلاب و
الطالبات وإلى كافة منسوبي الجامعة
التكنولوجية بمختلف فئاتهم ومسمياتهم
الجامعة التكنولوجية، لها تاريخ غني
بالنمو والتطوير . تأسست في البداية
ككلية الخرطوم التقنية في عام 1991، حيث
وضعت الأساس للتعليم التقني والمهني في منطقة جنوب الخرطوم. وعلى مدى ثلاثة
عقود كانت بمثابة ميدان تدريب حيوي للطلاب الذين يسعون لاكتساب المهارات
التقنية والهندسية. وفي عام 2018م تم ترقية الكلية إلى جامعة، مما يمثل معلما
هام في تاريخها. هذا التحول إلى جامعة تكنولوجية متكاملة يعكس التزاما بتوسيع
البرامج الأكاديمية واحتضان مجموعة أوسع من التخصصات
          </p>
        </div>

        {/* Profile Image Card */}
        <div className="p-4 shadow-2xl shrink-0 w-full md:w-[320px]">
          <img
            src="/president.png"
            alt="مدير الجامعة"
            className="w-full h-auto  object-cover mb-5"
          />
          <div className="text-center text-slate-50 pb-3">
            <h2 className="text-lg font-bold mb-2">مدير الجامعة</h2>
            <p className="text-sm font-medium text-slate-100/80">
              بروفيسور / أحمد عبدالقادر آدم
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default PresidentSection;
