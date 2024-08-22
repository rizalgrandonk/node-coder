import { cn } from "@/utils/helper";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

type FullPageLoadingProps = {
  className?: string;
  iconClass?: string;
};
export default function FullPageLoading({
  className,
  iconClass,
}: FullPageLoadingProps) {
  return (
    <div
      data-testid="full-page-loading"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/20",
        className
      )}
    >
      <div className="flex items-center gap-3 bg-white p-3 rounded">
        <ArrowPathIcon className={cn("size-6 animate-spin", iconClass)} />
        Loading...
      </div>
    </div>
  );
}
