/**
 * Representation of Report Configuration. 
 * Contains report name, Google Analytics 4 account and property, and
 * request data for AnalyticsData.Properties.runReport
 */
interface ReportConfig {
  name: string,
  account: string,
  property: string,
  request: Analyticsdata_v1beta.Analyticsdata.V1beta.Schema.RunReportRequest,
  response: Analyticsdata_v1beta.Analyticsdata.V1beta.Schema.RunReportResponse|null
};


/**
 * Report Configuration field list
 */
enum REPORT_FIELD_NAMES {
  name,
  account,
  property,
  dateRanges,
  metrics,
  dimensions,
  metricFilters,
  dimensionFilters,
}
