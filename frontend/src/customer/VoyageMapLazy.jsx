import { Suspense, lazy } from 'react';

const VoyageMap = lazy(() => import('./VoyageMap'));

function MapSkeleton({ height = '320px' }) {
  return (
    <div
      className="flex h-[var(--map-height)] animate-pulse flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-blue-50"
      style={{ '--map-height': height }}
      aria-hidden="true"
    >
      <div className="h-8 w-8 rounded-full bg-blue-100" />
      <div className="h-2.5 w-40 rounded-full bg-slate-200" />
      <div className="h-2 w-24 rounded-full bg-slate-100" />
    </div>
  );
}

/**
 * Code-split wrapper so Leaflet only loads when a map is actually shown.
 */
export default function VoyageMapLazy(props) {
  return (
    <Suspense fallback={<MapSkeleton height={props.height} />}>
      <VoyageMap {...props} />
    </Suspense>
  );
}
