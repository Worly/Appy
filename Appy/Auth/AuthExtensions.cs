using Appy.Domain;

namespace Appy.Auth
{
    public static class AuthExtensions
    {
        public static User CurrentUser(this HttpContext httpContext)
        {
            return httpContext.Items["User"] as User;
        }
    }
}
