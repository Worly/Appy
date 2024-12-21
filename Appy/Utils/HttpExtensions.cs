using Microsoft.Extensions.Primitives;

namespace Appy.Utils
{
    public static class HttpExtensions
    {
        public static void AddCustom(this IHeaderDictionary headers, string key, StringValues value)
        {
            headers.Add(key, value);
            headers.Add("Access-Control-Expose-Headers", key);
        }
    }
}
