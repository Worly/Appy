using System.Net;

namespace Appy.Exceptions
{
    public class NotFoundException : HttpException
    {
        public NotFoundException() : base(HttpStatusCode.NotFound, "Not found")
        {
        }

        public NotFoundException(string message) : base(HttpStatusCode.NotFound, message)
        {

        }
    }
}
