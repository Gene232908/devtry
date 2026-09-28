export type ArrivalStatus = "not_arrived" | "arrived" | null | undefined;

export type RescheduleArrivalReset = {
  arrival_status: "not_arrived";
  arrived_at: null;
  arrived_by: null;
};

/**
 * An arrival confirmation applies only to the appointment for which it was
 * recorded. Return the database fields that must be cleared when that
 * appointment moves. This intentionally has no inquiry-type branch: Regular
 * and Scrap leads use the same inspection handoff.
 */
export function arrivalResetForRescheduledInspection(
  previous: string | null,
  next: string | null,
  arrivalStatus: ArrivalStatus,
): RescheduleArrivalReset | null {
  const appointmentMoved =
    previous !== null &&
    next !== null &&
    new Date(previous).getTime() !== new Date(next).getTime();

  if (!appointmentMoved || arrivalStatus !== "arrived") return null;

  return {
    arrival_status: "not_arrived",
    arrived_at: null,
    arrived_by: null,
  };
}
