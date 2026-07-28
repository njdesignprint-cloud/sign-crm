(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.JobSaveUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function cloneList(value) {
    return Array.isArray(value) ? [...value] : [];
  }

  function prepareJobPayload(basePayload = {}, options = {}) {
    const existingJob = options.existingJob || {};
    const isNew = !!options.isNew;
    const payload = { ...basePayload };

    payload.payments = isNew ? [] : cloneList(existingJob.payments);
    payload.designImages = isNew
      ? cloneList(options.pendingImages)
      : cloneList(existingJob.designImages);
    payload.activityLog = [
      ...cloneList(options.activityLogBase),
      ...(options.logEntry ? [options.logEntry] : [])
    ];

    if (isNew && options.createdAt !== undefined) payload.createdAt = options.createdAt;
    if (!isNew && Object.prototype.hasOwnProperty.call(existingJob, "paid")) payload.paid = existingJob.paid;

    return payload;
  }

  return { prepareJobPayload };
});
