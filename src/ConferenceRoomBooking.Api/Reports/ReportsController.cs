using System.ComponentModel.DataAnnotations;
using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Application.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.Api.Reports;

/// <summary>
/// Reports for admins. Each covers the bookings that start within a period of venue-local days: confirmed bookings
/// count, and cancelled ones only appear as cancellations.
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize(Policy = Policies.AdminOnly)]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public sealed class ReportsController(ReportService reportService) : ControllerBase
{
    /// <summary>
    /// Revenue from the saved prices of confirmed bookings: rental, services, and total, split into earned (the slot
    /// has ended) and upcoming. Also given per room and per day or month, with cancellations and their lost revenue.
    /// </summary>
    /// <param name="period">The days the report covers.</param>
    /// <param name="groupBy">Day or Month (the default): what each entry of the periods list covers.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [HttpGet("revenue")]
    [ProducesResponseType<RevenueReportResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<RevenueReportResponse>> Revenue(
        [FromQuery] ReportPeriodQuery period,
        [FromQuery, EnumDataType(typeof(RevenueGrouping))] RevenueGrouping groupBy = RevenueGrouping.Month,
        CancellationToken cancellationToken = default)
    {
        var result = await reportService.GetRevenueAsync(
            period.From!.Value, period.To!.Value, groupBy, cancellationToken);

        return result.IsSuccess ? Ok(RevenueReportResponse.From(result.Value)) : this.ErrorResponse(result.Error);
    }
}
