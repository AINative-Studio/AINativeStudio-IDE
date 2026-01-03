import { IconWarning } from '../sidebar-tsx/SidebarChat.js';


export const WarningBox = ({ text, onClick, className }: {text: string;onClick?: () => void;className?: string;}) => {

  return <div
    className={` ainative-text-void-warning ainative-brightness-90 ainative-opacity-90 ainative-w-fit ainative-text-xs ainative-text-ellipsis ${


    onClick ? `hover:ainative-brightness-75 ainative-transition-all ainative-duration-200 ainative-cursor-pointer` : ""} ainative-flex ainative-items-center ainative-flex-nowrap ${

    className} `}

    onClick={onClick}>

		<IconWarning
      size={14}
      className="ainative-mr-1 ainative-flex-shrink-0" />

		<span>{text}</span>
	</div>;
  // return <VoidSelectBox
  // 	options={[{ text: 'Please add a model!', value: null }]}
  // 	onChangeSelection={() => { }}
  // />
};