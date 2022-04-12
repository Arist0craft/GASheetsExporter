/**
 * Adds a custom menu with items to show the create new report sidebar
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
      .createAddonMenu()
      .addItem('Create new report', 'showCreateReportSidebar')
      .addToUi();
}


/**
 * Open a creating new report sidebar
 */
function showCreateReportSidebar() {
  const ui = HtmlService.createTemplateFromFile("CreateReportSidebar")
    .evaluate()
    .setTitle("Create new report")
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(ui);
}
