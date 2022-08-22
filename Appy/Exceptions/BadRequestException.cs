using System.Net;

namespace Appy.Exceptions
{
    public class BadRequestException : HttpException
    {
        public BadRequestException() : base(HttpStatusCode.BadRequest, "Bad request")
        {

        }

        public BadRequestException(string message) : base(HttpStatusCode.BadRequest, message)
        {

        }
    }
}
