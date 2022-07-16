using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Appy.Auth;

namespace Appy.Services.Facilities
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class SelectedFacilityAttribute : Attribute, IResourceFilter
    {
        public SelectedFacilityAttribute()
        {

        }

        public void OnResourceExecuting(ResourceExecutingContext context)
        {
            if (!context.HttpContext.Items.ContainsKey("facilityId"))
            {
                context.Result = new JsonResult(new { message = "Missing facility-id" }) { StatusCode = StatusCodes.Status400BadRequest };
                return;
            }

            if (!context.HttpContext.CurrentUser().Facilities.Any(w => w.Id == (int)context.HttpContext.Items["facilityId"]))
            {
                context.Result = new JsonResult(new { message = "Wrong facility-id" }) { StatusCode = StatusCodes.Status404NotFound };
                return;
            }
        }

        public void OnResourceExecuted(ResourceExecutedContext context)
        {
            
        }
    }
}
