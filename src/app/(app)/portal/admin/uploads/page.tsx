import { Suspense } from "react";

import { UploadsManager } from "@/components/admin/uploads-manager";

export default function AdminUploadsPage() {
  // UploadsManager reads filters from the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <UploadsManager />
    </Suspense>
  );
}
