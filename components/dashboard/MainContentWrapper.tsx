
interface MainContentWrapperProps {
    children: React.ReactNode;
}

export default function MainContentWrapper({ children }: MainContentWrapperProps) {
    return (
        <div className="flex-1 h-full overflow-y-auto px-8 py-6">
            {children}
        </div>
    );
}