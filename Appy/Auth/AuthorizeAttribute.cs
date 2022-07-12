using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Appy.Auth
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class AuthorizeAttribute : Attribute, IAuthorizationFilter
    {
        private string[] roles;

        public AuthorizeAttribute()
        {

        }

        public AuthorizeAttribute(params string[] roles)
        {
            this.roles = roles;
        }

        public void OnAuthorization(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.CurrentUser();
            if (user == null)
            {
                // not logged in
                context.Result = new JsonResult(new { message = "Unauthorized" }) { StatusCode = StatusCodes.Status401Unauthorized };
                return;
            }

            var userRoles = user.GetRoles();

            if (roles != null && roles.All(r => !userRoles.Contains(r)))
            {
                // does not have permissions
                context.Result = new JsonResult(new { message = "Forbidden" }) { StatusCode = StatusCodes.Status403Forbidden };
                return;
            }
        }
    }
}
