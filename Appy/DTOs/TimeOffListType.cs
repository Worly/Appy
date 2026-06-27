namespace Appy.DTOs
{
    // Which tab the time-off list endpoint serves. "Recurring" = Weekly or Monthly.
    public enum TimeOffListType
    {
        OneOff,
        Recurring,
    }

    // Active = today/future or open-ended; History = ended before today.
    public enum TimeOffScope
    {
        Active,
        History,
    }
}
