using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Appy.Services.SmartFilter
{
    public class SmartFilterParser
    {
        public static readonly Dictionary<string, Comparator> StringToComparator = new Dictionary<string, Comparator>()
        {
            { "==", Comparator.Equal },
            { "<", Comparator.LessThan },
            { ">", Comparator.GreaterThan },
            { "<=", Comparator.LessThanOrEqual },
            { ">=", Comparator.GreaterThanOrEqual },
            { "!=", Comparator.NotEquals },
            { "contains", Comparator.Contains }
        };

        public static string ComparatorToString(Comparator comparator)
        {
            return StringToComparator.First(v => v.Value == comparator).Key;
        }   

        public static SmartFilter Parse(string input)
        {
            var node = JToken.Parse(input);

            return ParseSmartFilter(node);
        }

        private static SmartFilter ParseSmartFilter(JToken node)
        {
            if (node.Type != JTokenType.Array || node is not JArray array)
            {
                throw new ArgumentException("Wrong format of smart filter. Expected an array got " + node.Type);
            }

            if (array.Count == 2 && array[0].Type == JTokenType.String && ((string?)array[0]) == "not")
            {
                return SmartFilter.Not(ParseSmartFilter(array[1]));
            }
            else if (array.Count == 3 && array[0].Type == JTokenType.Array && array[1].Type == JTokenType.String && array[2].Type == JTokenType.Array)
            {
                var left = ParseSmartFilter(array[0]);
                var right = ParseSmartFilter(array[2]);
                return (string?)array[1] switch
                {
                    "and" => SmartFilter.And(left, right),
                    "or" => SmartFilter.Or(left, right),
                    _ => throw new ArgumentException("Wrong format of smart filter. Undefined logical operator " + ((string?)array[1])),
                };
            }
            else if (array.Count == 3 && array[0].Type == JTokenType.String && array[1].Type == JTokenType.String &&
                (array[2].Type == JTokenType.String ||
                array[2].Type == JTokenType.Integer ||
                array[2].Type == JTokenType.Float ||
                array[2].Type == JTokenType.Null))
            {
                var propertyName = (string?)array[0];
                if (propertyName == null)
                {
                    throw new ArgumentNullException(nameof(propertyName));
                }

                var comparatorStr = (string?)array[1];
                if (comparatorStr == null)
                {
                    throw new ArgumentNullException(nameof(comparatorStr));
                }

                return SmartFilter.FromFieldFilter(ParseFieldFilter(propertyName, comparatorStr, array[2]));
            }
            else
            {
                throw new ArgumentException("Wrong format of smart filter.");
            }
        }

        private static FieldFilter ParseFieldFilter(string propertyName, string comparatorStr, JToken value)
        {
            if (!StringToComparator.TryGetValue(comparatorStr, out Comparator comparator)) {
                throw new ArgumentException("Wrong format of field filter. Undefined comparator " + comparatorStr);
            }

            return value.Type switch
            {
                JTokenType.String => new FieldFilter(propertyName, comparator, ((string?)value)),
                JTokenType.Integer => new FieldFilter(propertyName, comparator, ((int)value)),
                JTokenType.Float => new FieldFilter(propertyName, comparator, ((float)value)),
                JTokenType.Null => new FieldFilter(propertyName, comparator, null),
                _ => throw new ArgumentException("Wrong format of smart filter. Value cannot be of type " + value.Type),
            };
        }
    }
}
