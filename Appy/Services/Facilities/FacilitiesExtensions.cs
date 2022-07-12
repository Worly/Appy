namespace Appy.Services.Facilities
{
    public static class FacilitiesExtensions
    {
        public static int SelectedFacility(this HttpContext httpContext)
        {
            return (int)httpContext.Items["FacilityId"];
        }
    }
}
