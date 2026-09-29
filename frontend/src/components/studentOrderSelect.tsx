import { useTranslation } from "react-i18next";
import FilterSelect from "./filterSelect";
import { STUDENT_ORDERS, type StudentOrder } from "../utils/studentOrder";

type StudentOrderSelectProps = {
	id: string;
	value: StudentOrder;
	onChange: (value: StudentOrder) => void;
};

// how a list of students is ordered: by university number, or alphabetically by name
const StudentOrderSelect = ({ id, value, onChange }: StudentOrderSelectProps) => {
	const { t } = useTranslation();
	return (
		<FilterSelect
			id={id}
			label={t("studentOrder.label")}
			value={value}
			onChange={(next) => onChange(next as StudentOrder)}
			allLabel={t("studentOrder.uniNumber")}
			options={STUDENT_ORDERS.map((order) => ({ value: order, label: t(`studentOrder.${order}`) }))}
		/>
	);
};

export default StudentOrderSelect;
