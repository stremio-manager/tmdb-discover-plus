import { RangeSlider, SingleSlider } from '../../RangeSlider';
import { SearchableSelect } from '../../SearchableSelect';
import { LabelWithTooltip } from '../../Tooltip';

export function CatalogCoreFilters({
  catalog,
  onFiltersChange,
  sortOptions,
  datePresets,
  selectedDatePreset,
  onDatePresetChange,
  releaseTypes,
  tvStatuses,
  tvTypes,
  certifications,
  currentYear
}) {
  const isMovie = catalog.type === 'movie';
  const filters = catalog.filters;

  return (
    <>
      <div className="filter-three-col">
        {/* Sort By */}
        <div className="filter-group">
          <LabelWithTooltip
            label="Sort By"
            tooltip="Order results by Popularity, Release Date, Rating, or Revenue."
          />
          <SearchableSelect
            options={sortOptions[catalog.type] || []}
            value={filters.sortBy}
            onChange={(val) => onFiltersChange('sortBy', val)}
            placeholder="Sort Order"
            allowClear={false}
            labelKey="label"
            valueKey="value"
          />
        </div>

        {/* Date Ranges / Presets */}
        <div className="filter-group" style={{ gridColumn: 'span 2' }}>
          <LabelWithTooltip
            label={isMovie ? 'Release Date' : 'Air Date'}
            tooltip="Filter by when the content was released or aired."
          />
          <div className="date-controls">
            <select
              className="select"
              value={selectedDatePreset || ''}
              onChange={(e) => {
                const preset = datePresets.find((p) => p.label === e.target.value);
                onDatePresetChange(preset);
              }}
            >
              <option value="">Custom Date Range</option>
              {datePresets.map((p) => (
                <option key={p.value} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>

            {!selectedDatePreset && (
              <div className="date-inputs">
                <input
                  type="number"
                  className="input date-input"
                  placeholder="From Year"
                  min="1900"
                  max={currentYear + 5}
                  value={
                    isMovie
                      ? filters.primaryReleaseDateFrom?.split('-')[0] ||
                        filters.releaseDateFrom?.split('-')[0] ||
                        ''
                      : filters.airDateFrom?.split('-')[0] || ''
                  }
                  onChange={(e) => {
                    const field = isMovie ? 'primaryReleaseDateFrom' : 'airDateFrom';
                    const val = e.target.value ? `${e.target.value}-01-01` : undefined;
                    onFiltersChange(field, val);
                  }}
                />
                <span className="date-separator">-</span>
                <input
                  type="number"
                  className="input date-input"
                  placeholder="To Year"
                  min="1900"
                  max={currentYear + 5}
                  value={
                    isMovie
                      ? filters.primaryReleaseDateTo?.split('-')[0] ||
                        filters.releaseDateTo?.split('-')[0] ||
                        ''
                      : filters.airDateTo?.split('-')[0] || ''
                  }
                  onChange={(e) => {
                    const field = isMovie ? 'primaryReleaseDateTo' : 'airDateTo';
                    const val = e.target.value ? `${e.target.value}-12-31` : undefined;
                    onFiltersChange(field, val);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="filter-sliders">
        <div className="filter-group">
          <RangeSlider
            label={`IMDb Rating: ${filters.ratingMin || 0} - ${filters.ratingMax || 10}`}
            tooltip="Filter by IMDb Vote Average (0-10)"
            min={0}
            max={10}
            step={0.1}
            value={[filters.ratingMin || 0, filters.ratingMax || 10]}
            onChange={([min, max]) => {
              onFiltersChange('ratingMin', min);
              onFiltersChange('ratingMax', max);
            }}
          />
        </div>

        <div className="filter-group">
          <SingleSlider
            label={`Min Votes: ${filters.voteCountMin || 0}`}
            tooltip="Minimum number of votes to ensure rating quality."
            min={0}
            max={10000}
            step={50}
            value={filters.voteCountMin || 0}
            onChange={(val) => onFiltersChange('voteCountMin', val)}
          />
        </div>

        <div className="filter-group">
          <RangeSlider
            label={`Runtime: ${filters.runtimeMin || 0} - ${filters.runtimeMax || 400} min`}
            tooltip="Duration in minutes."
            min={0}
            max={400}
            step={5}
            value={[filters.runtimeMin || 0, filters.runtimeMax || 400]}
            onChange={([min, max]) => {
              onFiltersChange('runtimeMin', min === 0 ? undefined : min);
              onFiltersChange('runtimeMax', max === 400 ? undefined : max);
            }}
          />
        </div>
      </div>
      
      {/* Dropdown Filters (Certifications, Status, etc) */}
        <div className="filter-three-col" style={{marginTop: '1rem'}}>
          <div className="filter-group">
            <LabelWithTooltip
              label="Certification"
              tooltip="Content rating (e.g., PG-13, R, TV-MA). Defaults to US."
            />
             <select
                className="select"
                value={
                  filters.certifications && filters.certifications.length > 0
                    ? filters.certifications[0]
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  onFiltersChange('certifications', val ? [val] : []);
                }}
              >
                <option value="">Any Rating</option>
                {/* 
                   Checking if certifications is array or object map. 
                   Typically certifications[catalog.type] is an array of objects
                 */}
                {(certifications[catalog.type] || []).map((c) => (
                  <option key={c.certification} value={c.certification}>
                    {c.certification}
                  </option>
                ))}
              </select>
          </div>

          {!isMovie && (
             <>
               <div className="filter-group">
                 <LabelWithTooltip label="Status" tooltip="Current status of the show." />
                 <SearchableSelect
                   options={tvStatuses}
                   value={filters.withStatus || ''}
                   onChange={(val) => onFiltersChange('withStatus', val)}
                   placeholder="Any Status"
                   labelKey="name" // Verify key
                   valueKey="id"   // Verify key
                 />
               </div>
               <div className="filter-group">
                 <LabelWithTooltip label="Type" tooltip="Scripted, Reality, Documentary, etc." />
                 <SearchableSelect
                   options={tvTypes}
                   value={filters.withType || ''}
                   onChange={(val) => onFiltersChange('withType', val)}
                   placeholder="Any Type"
                   labelKey="name"
                   valueKey="id"
                 />
               </div>
             </>
          )}

           {isMovie && (
              <div className="filter-group">
                 <LabelWithTooltip label="Release Type" tooltip="Theatrical, Digital, Premieres." />
                 <SearchableSelect
                   options={releaseTypes}
                   value={filters.withReleaseType || ''}
                   onChange={(val) => onFiltersChange('withReleaseType', val)}
                   placeholder="Any Type"
                   labelKey="name" // Verify key
                   valueKey="id"   // Verify key
                 />
              </div>
           )}
        </div>

    </>
  );
}
