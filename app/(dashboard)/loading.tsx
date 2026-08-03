import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full bg-[#F8F9F5]">
      <div className="flex flex-col items-center gap-3 font-inter text-xs text-[#6B6E64]">
        <Loader2 className="w-7 h-7 animate-spin text-[#4F46C7] stroke-[1.5]" />
        <span className="animate-pulse tracking-wide font-medium">Loading workspace...</span>
      </div>
    </div>
  );
}
