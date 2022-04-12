const CURRENT_SPREADSHEET: GoogleAppsScript.Spreadsheet.Spreadsheet
= SpreadsheetApp.getActiveSpreadsheet();


/**
 * Getting and parsing report configs from ReportConfig Sheet
 * @returns All corrected report configs
 */
function getReportConfig(): ReportConfig[] {
  // Getting current SpreadSheet


  //  Getting sheet with configurations
  const configSheet: GoogleAppsScript.Spreadsheet.Sheet 
    = CURRENT_SPREADSHEET.getSheetByName("ReportConfig");

  if (!configSheet) {
    const message: string = "Configuration not found"
    Logger.log(message);
    throw Error(message)
  }

  const lastColumn = configSheet.getLastColumn();
  let rangeNotations: string[] = []

  for (let i = 2; i <= lastColumn; i++) {
    rangeNotations.push(`R2C${i}:R${Object.keys(REPORT_FIELD_NAMES).length / 2}C${i}`);
  }

  const ranges: GoogleAppsScript.Spreadsheet.Range[]
    = configSheet.getRangeList(rangeNotations).getRanges();

  let reportsConfig: ReportConfig[] = [];

  for (const range of ranges) {
    const report: ReportConfig = parseReportConfig(range);
    if (
      report.name 
      && report.account 
      && report.property 
      && report.request.metrics
      && report.request.dimensions
      && report.request.dateRanges.every(
        dateRange => dateRange.startDate && dateRange.endDate
      )
    ) {
      reportsConfig.push(report);
    }
  }

  return reportsConfig
}


/**
 * Function which parsing request and configuration data from Google Sheets ReportConfig sheet.
 * Each field has to be in strict order on range: name, account, property, etc...
 * @param range Google Sheets report column from ReportConfig sheet
 * @returns Google Analytics report configuration: account, property, request
 */
function parseReportConfig(range: GoogleAppsScript.Spreadsheet.Range): ReportConfig {
  const rangeValues: (string|number)[][] = range.getValues();

  let name = "";
  let account = "";
  let property = "";
  const request = AnalyticsData.newRunReportRequest();

  for (const i in REPORT_FIELD_NAMES) {
    if (isNaN(Number(i))) {
      break;
    }

    const fieldName = REPORT_FIELD_NAMES[i];
    const fieldValue = rangeValues[i]?.[0];

    switch (Number(i)) {
      case REPORT_FIELD_NAMES.name:
        name = fieldValue as string;

      case REPORT_FIELD_NAMES.account:
        account = fieldValue as string;
        break;
      
      case REPORT_FIELD_NAMES.property:
        property = fieldValue as string;
        request[fieldName] = fieldValue;
        break;
      
      case REPORT_FIELD_NAMES.dateRanges:
        request[fieldName] = parseRequestFieldProperty(fieldValue, AnalyticsData.newDateRange);        
        break;
      
      case REPORT_FIELD_NAMES.metrics:
        request[fieldName] = parseRequestFieldProperty(fieldValue, AnalyticsData.newMetric);
        break;
      
      case REPORT_FIELD_NAMES.dimensions:
        request[fieldName] = parseRequestFieldProperty(fieldValue, AnalyticsData.newDimension);
        break;
      
      case REPORT_FIELD_NAMES.metricFilters:
        break;

      case REPORT_FIELD_NAMES.dimensionFilters:
        break;
    
      default:
        request[fieldName] = fieldValue;
        break;
    }
  }

  request.returnPropertyQuota = true;

  return {
    name: name,
    account: account, 
    property: property, 
    request: request, 
    response: null
  };
}


/**
 * Getting reports data through api and writing to each report sheet
 */
function reportsDataToSheet() {
  const reports: ReportConfig[] = getReportConfig();
  for (const report of reports) {
    try {
      report.response = AnalyticsData.Properties.runReport(report.request, report.property);
      appendReportsData(report, new Date());

    } catch (e) {
      const message = `Something went wrong with getting data for ${report.property}/${report.name}: ${e}`;
      Logger.log(message);
      throw Error(message);
    }
  }
}


/**
 * Function for writing report response data in sheet with same name as report.
 * If sheet doesn't exists function creates it.
 * @param report Report which should be writed in Sheet
 * @param reportDate Datetime of getting report data
 * @returns Nothing if report data wasn't getted
 */
function appendReportsData(report: ReportConfig, reportDate: Date) {
  if(!report.response) {
    return;
  }

  let reportSheet = CURRENT_SPREADSHEET.getSheetByName(report.name);

  // Create Sheet for report data if it not exists
  if (!reportSheet) {
    reportSheet = CURRENT_SPREADSHEET.insertSheet(report.name);
    const header = [
      "startDate", 
      "endDate",
    ];
    report.response.dimensionHeaders.forEach(h => header.push(h.name));
    report.response.metricHeaders.forEach(h => header.push(h.name));
    header.push("reportTime");

    reportSheet.appendRow(header);
  }

  for (const valuesRow of report.response.rows) {
    const row = []
    let requestDateRange: Analyticsdata_v1beta.Analyticsdata.V1beta.Schema.DateRange;

    if (report.request.dateRanges.length > 1) {
      const responseRowDateRange = valuesRow.dimensionValues.pop().value;
      requestDateRange = report.request.dateRanges[Number(responseRowDateRange)];

    } else {
      requestDateRange = report.request.dateRanges[0];
    }

    row.push(requestDateRange.startDate,  requestDateRange.endDate);

    // Finding date in report and returing in ISO format
    const dateIndex = report.response.dimensionHeaders.findIndex(e => e.name == "date");
    if (dateIndex != -1) {
      const [dateValue] =  valuesRow.dimensionValues.splice(dateIndex, 1);
      const year = Number(dateValue.value.substring(0, 4));
      const month = Number(dateValue.value.substring(4, 6)) - 1;
      const day = Number(dateValue.value.substring(6, 8));
      const date = new Date(year, month, day);

      valuesRow.dimensionValues.splice(dateIndex, 0, {value: date.toISOString().substring(0, 10)});
    }

    valuesRow.dimensionValues.forEach(dv => row.push(dv.value));
    valuesRow.metricValues.forEach(mv => row.push(mv.value));
    row.push(reportDate.toISOString());

    reportSheet.appendRow(row);
  }
}