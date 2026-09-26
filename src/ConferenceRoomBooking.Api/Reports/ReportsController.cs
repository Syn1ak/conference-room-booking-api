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

    /// <summary>
    /// Occupancy of each room and of all rooms together: booked hours of confirmed bookings against open hours
    /// (06:00–23:00, 17 hours a day), the average attendee count, how full the room is against its current capacity,
    /// and cancellations.
    /// </summary>
    /// <param name="period">The days the report covers.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [HttpGet("occupancy")]
    [ProducesResponseType<OccupancyReportResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OccupancyReportResponse>> Occupancy(
        [FromQuery] ReportPeriodQuery period, CancellationToken cancellationToken)
    {
        var result = await reportService.GetOccupancyAsync(period.From!.Value, period.To!.Value, cancellationToken);

        return result.IsSuccess ? Ok(OccupancyReportResponse.From(result.Value)) : this.ErrorResponse(result.Error);
    }

    /// <summary>
    /// Demand by time band: the hours of confirmed bookings in each band (Morning, Standard, Peak, Evening) against
    /// the hours the rooms could have been booked in it, over the whole period and for each weekday. Shows whether
    /// the band discounts and surcharges match demand.
    /// </summary>
    /// <param name="period">The days the report covers.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [HttpGet("demand")]
    [ProducesResponseType<DemandReportResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DemandReportResponse>> Demand(
        [FromQuery] ReportPeriodQuery period, CancellationToken cancellationToken)
    {
        var result = await reportService.GetDemandAsync(period.From!.Value, period.To!.Value, cancellationToken);

        return result.IsSuccess ? Ok(DemandReportResponse.From(result.Value)) : this.ErrorResponse(result.Error);
    }

    /// <summary>
    /// Uptake of each catalog service: how many confirmed bookings include it, as a share of all confirmed bookings,
    /// and what it brought in at the prices saved with the bookings.
    /// </summary>
    /// <param name="period">The days the report covers.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [HttpGet("services")]
    [ProducesResponseType<ServiceUptakeReportResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ServiceUptakeReportResponse>> ServiceUptake(
        [FromQuery] ReportPeriodQuery period, CancellationToken cancellationToken)
    {
        var result = await reportService.GetServiceUptakeAsync(
            period.From!.Value, period.To!.Value, cancellationToken);

        return result.IsSuccess
            ? Ok(ServiceUptakeReportResponse.From(result.Value))
            : this.ErrorResponse(result.Error);
    }
}
