using System.ComponentModel.DataAnnotations;

namespace ConferenceRoomBooking.Api.Reports;

/// <summary>
/// The days a report covers, as dates in venue time with both ends included.
/// </summary>
/// <param name="From">The first day, for example 2024-09-01.</param>
/// <param name="To">The last day, for example 2024-09-30. A report covers at most 366 days.</param>
public sealed record ReportPeriodQuery([Required] DateOnly? From, [Required] DateOnly? To);
