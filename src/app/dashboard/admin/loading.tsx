export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-64 bg-muted animate-pulse rounded" />
        <div className="h-5 w-96 bg-muted animate-pulse rounded mt-2" />
      </div>
      <div className="space-y-4">
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="h-96 w-full bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}
