using Appy.DTOs;
using System.Net;
using System.Text.Json;

namespace Appy.Exceptions
{
    public class ValidationException : HttpException
    {
        public ValidationException(string errorCode)
            : base(HttpStatusCode.BadRequest, JsonSerializer.Serialize(new ErrorBuilder().Add(errorCode), new JsonSerializerOptions()
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }))
        {
        }

        public ValidationException(string propertyName, string errorCode)
            : base(HttpStatusCode.BadRequest, JsonSerializer.Serialize(new ErrorBuilder().Add(propertyName, errorCode), new JsonSerializerOptions()
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }))
        {
        }
    }
}
