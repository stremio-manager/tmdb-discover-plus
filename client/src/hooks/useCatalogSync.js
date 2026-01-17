import { useEffect, useRef } from 'react';

/**
 * Hook to sync local catalog changes back to the parent component with a debounce.
 * @param {Object} props
 * @param {Object} props.localCatalog The local state of the catalog.
 * @param {Object} props.catalog The prop passed from parent (source of truth).
 * @param {Function} props.onUpdate Callback to update parent.
 * @param {Array} props.dependencies Additional dependencies to trigger sync (e.g. selected items).
 */
export function useCatalogSync({
  localCatalog,
  catalog,
  onUpdate,
  dependencies = [],
}) {
  const initialSyncRef = useRef(true);
  const syncTimeoutRef = useRef(null);

  useEffect(() => {
    // Don't sync immediately after receiving a new `catalog` prop
    if (!catalog || !catalog._id) return;

    if (initialSyncRef.current) {
      // Skip the first effect run which comes from prop sync
      initialSyncRef.current = false;
      return;
    }

    // Debounce updates to avoid rapid parent updates while typing
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      if (typeof onUpdate === 'function') {
        onUpdate(catalog._id, localCatalog);
      }
    }, 250);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  // We explicitly want to run this effect when localCatalog changes or dependencies change,
  // but we also need to respect the catalog._id check.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCatalog, catalog?._id, onUpdate, ...dependencies]);
}
