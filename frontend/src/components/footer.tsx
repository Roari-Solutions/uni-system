import { PhoneIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";

const Footer = () => {
      return <footer className="border-t border-slate-200 bg-slate-900 px-6 py-14 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">الجامعة التكنولوجية</h2>
            <p className="mt-2 text-sm text-slate-400">لتقديم تعليم متميز و بحوث علمية تقنية مبتكرة لتلبية تغيرات العصر المعرفية و البحثية و المحتمعية</p>
          </div>
          
          <ul className="flex items-center gap-4">
            {/* Media accounts */}
            <li><a href="#social1" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition-all duration-200 hover:border-slate-500 hover:text-white hover:bg-slate-800"></a></li>
            <li><a href="#social2" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition-all duration-200 hover:border-slate-500 hover:text-white hover:bg-slate-800"></a></li>
            <li><a href="#social3" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition-all duration-200 hover:border-slate-500 hover:text-white hover:bg-slate-800"></a></li>
            <li><a href="#social4" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition-all duration-200 hover:border-slate-500 hover:text-white hover:bg-slate-800"></a></li>
          </ul>
        </div>
        
        <div className="mx-auto mt-10 grid max-w-6xl gap-8 border-t border-slate-800 pt-10 md:grid-cols-3">
          {/* Quick links - Column 1 */}
          <ul className="flex flex-col gap-3">
            <li><Link to={{pathname: "/deanship/students"}} className="text-sm text-slate-400 transition-colors duration-200 hover:text-white">عمادة شؤون الطلاب</Link></li>
            <li><Link to={{pathname: "/secretariats/science"}} className="text-sm text-slate-400 transition-colors duration-200 hover:text-white">امانة الشؤون العلمية</Link></li>
            <li><a href="#president-word" className="text-sm text-slate-400 transition-colors duration-200 hover:text-white">كلمة رئيس الجامعة</a></li>
          </ul>
          
          {/* Quick links - Column 2 */}
          <ul className="flex flex-col gap-3">
            <li><Link to={{pathname: "/applications/student-apply"}} className="text-sm text-slate-400 transition-colors duration-200 hover:text-white">بوابة الطلاب</Link></li>
            <li><Link to={{}} className="text-sm text-slate-400 transition-colors duration-200 hover:text-white">بوابة المدرسين</Link></li>
            <li><Link to={{pathname: "/applications/admins-apply"}} className="text-sm text-slate-400 transition-colors duration-200 hover:text-white">بوابة الإداريين</Link></li>
          </ul>
        
          <div>
            {/* Contacts */}
            <h3 className="mb-4 text-lg font-semibold text-white">تواصل معنا على</h3>
            <address className="not-italic">
              <p className="mb-2 flex items-center gap-2 text-sm text-slate-400"><PhoneIcon className="h-4 w-4" />هاتف: +1 123 456 7890</p>
              <p className="flex items-center gap-2 text-sm text-slate-400"><EnvelopeIcon className="h-4 w-4" />بريد إلكتروني: contact@university.edu</p>
            </address>
          </div>
        </div>
      </footer>
}

export default Footer;

