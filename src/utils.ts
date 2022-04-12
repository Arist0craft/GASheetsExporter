/**
 * Parser for aliases which can be in both of start and end date range
 * Example: today, yesterday
 * @param dateAlias Alias for date or date range
 * @returns Date parsed from alias or date|specific alias if common alias wasn't found
 */
function parseDateAliasesCommon(dateAlias: string): Date|string {
  const today = new Date();

  switch (dateAlias) {
    case "today":
      return today;

    case "yesterday":
      today.setDate(today.getDate() - 1);
      return today;

    default:
      return dateAlias;
  }
}


/**
 * Parser for dates from ReportCongig Sheet
 * @param dateRange Tuple represents date range, contains start date and end date
 * @returns Tuple with ISO formated start and end data range dates
 */
function parseDateAliasesAll(dateRange: string[]): string[] {
  const parsedDateRange: (Date|string)[] = dateRange.map(parseDateAliasesCommon);
  
  // Check specific aliases
  switch (parsedDateRange[0]) {
    case "monthTruncate":
      const monthTruncate = new Date(parsedDateRange[1]);
      monthTruncate.setDate(1);
      parsedDateRange[0] = monthTruncate;
      break;
  }

  return parsedDateRange.map(d => (d as Date).toISOString().substring(0, 10));
}

/**
 * Abstaction level for parsing properties of each field of configuration 
 * request from ReportConfig Sheet
 * @param fieldValue Field value from ReportConfig Sheet. Example Dimensions
 * @param propertyFabric Fabric function from AnalyticsData library for setting specific field properties
 * @returns Field values with setted properties
 * @example parseRequestFieldProperty(activeUsers;events, AnalyticsData.newMetric) return [
 * Analyticsdata_v1beta.Analyticsdata.V1beta.Schema.Metric(name="activeUsers")
 * Analyticsdata_v1beta.Analyticsdata.V1beta.Schema.Metric(name="events"),
 * ]
 */
function parseRequestFieldProperty(fieldValue: string|number, propertyFabric: CallableFunction) {
  const propertyValues = [];
  const parsedPropertyValues = (fieldValue as string).split(";");
  for (let i = 0; i < parsedPropertyValues.length; i++){
    const parsedPropertyValue = parsedPropertyValues[i];
    const propertyValue = propertyFabric();

    switch(propertyFabric) {
      case AnalyticsData.newDimension:
      case AnalyticsData.newMetric:
        propertyValue.name = parsedPropertyValue;
        propertyValues.push(propertyValue);
        break;

      case AnalyticsData.newDateRange:
        if ((fieldValue as string).split(";").length > 4) {
          const message = "Only maximum 4 data ranges can be in report";
          Logger.log(message);
          throw Error(message);
        }

        [propertyValue.startDate,  propertyValue.endDate] =
          parseDateAliasesAll(parsedPropertyValue.split(":"));
        propertyValue.name = String(i);
          propertyValues.push(propertyValue);
        break;
    }
  }

  return propertyValues;
}