using Appy.Utils;
using System.ComponentModel;
using System.Linq.Expressions;
using System.Reflection;

namespace Appy.Services.SmartFiltering
{
    [TypeConverter(typeof(SmartFilterConverter))]
    public class SmartFilter
    {
        public enum SmartFilterType
        {
            Not,
            And,
            Or,
            FieldFilter
        }

        public SmartFilterType Type { get; private set; }

        public SmartFilter? Left { get; private set; }
        public SmartFilter? Right { get; private set; }

        public FieldFilter? FieldFilter { get; private set; }

        private SmartFilter(SmartFilterType type)
        {
            this.Type = type;
        }

        public static SmartFilter FromFieldFilter(FieldFilter fieldFilter)
        {
            return new SmartFilter(SmartFilterType.FieldFilter)
            {
                FieldFilter = fieldFilter
            };
        }

        public static SmartFilter Not(SmartFilter smartFilter)
        {
            return new SmartFilter(SmartFilterType.Not)
            {
                Right = smartFilter
            };
        }

        public static SmartFilter And(SmartFilter left, SmartFilter right)
        {
            return new SmartFilter(SmartFilterType.And)
            {
                Left = left,
                Right = right
            };
        }

        public static SmartFilter Or(SmartFilter left, SmartFilter right)
        {
            return new SmartFilter(SmartFilterType.Or)
            {
                Left = left,
                Right = right
            };
        }

        public Expression ToExpression<T>(ParameterExpression parameter)
        {
            if (Type == SmartFilterType.Not && Right != null)
            {
                return Expression.Not(Right.ToExpression<T>(parameter));
            }
            else if (Type == SmartFilterType.And && Left != null && Right != null)
            {
                return Expression.And(Left.ToExpression<T>(parameter), Right.ToExpression<T>(parameter));
            }
            else if (Type == SmartFilterType.Or && Left != null && Right != null)
            {
                return Expression.Or(Left.ToExpression<T>(parameter), Right.ToExpression<T>(parameter));
            }
            else if (Type == SmartFilterType.FieldFilter && FieldFilter != null)
            {
                return FieldFilter.ToExpression<T>(parameter);
            }
            else
            {
                throw new InvalidOperationException();
            }
        }

        public override bool Equals(object? o)
        {
            if (o is not SmartFilter other)
            {
                return false;
            }

            // Optimization for a common success case.
            if (Object.ReferenceEquals(this, other))
            {
                return true;
            }

            // If run-time types are not exactly the same, return false.
            if (this.GetType() != other.GetType())
            {
                return false;
            }

            return this.Type == other.Type &&
                this.Left == other.Left &&
                this.Right == other.Right &&
                this.FieldFilter == other.FieldFilter;
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(Type, Left, Right, FieldFilter);
        }

        public static bool operator ==(SmartFilter? lhs, SmartFilter? rhs)
        {
            if (lhs is null)
            {
                if (rhs is null)
                {
                    return true;
                }

                // Only the left side is null.
                return false;
            }
            // Equals handles case of null on right side.
            return lhs.Equals(rhs);
        }

        public static bool operator !=(SmartFilter? lhs, SmartFilter? rhs) => !(lhs == rhs);
    }

    public class FieldFilter
    {
        public enum FieldFilterType
        {
            String,
            Number,
            Null
        }

        public string PropertyName { get; private set; }
        public Comparator Comparator { get; private set; }
        public FieldFilterType Type { get; private set; }

        public string? StringValue { get; private set; }
        public float? NumberValue { get; private set; }

        public FieldFilter(string propertyName, Comparator comparator, float number)
        {
            if (comparator == Comparator.Contains)
            {
                throw new ArgumentException($"Cannot use comparator {comparator} with number value.");
            }

            this.PropertyName = propertyName;
            this.Comparator = comparator;
            this.Type = FieldFilterType.Number;
            this.NumberValue = number;
        }

        public FieldFilter(string propertyName, Comparator comparator, string? str)
        {
            if (str == null)
            {
                if (comparator != Comparator.Equal && comparator != Comparator.NotEquals)
                {
                    throw new ArgumentException($"Cannot use comparator {comparator} with null value. Possible comparators are '==' and '!='.");
                }
            }

            this.PropertyName = propertyName;
            this.Comparator = comparator;
            this.Type = str != null ? FieldFilterType.String : FieldFilterType.Null;
            this.StringValue = str;
        }

        public Expression ToExpression<T>(ParameterExpression parameter)
        {
            var property = typeof(T).GetProperty(PropertyName.FirstCharToUpper(), BindingFlags.Public | BindingFlags.Instance);
            if (property == null)
            {
                throw new ArgumentException($"Cannot find property with name {PropertyName} on type {typeof(T)}");
            }

            var propertyGetter = Expression.Property(parameter, property);
            var value = Expression.Constant(Type switch
            {
                FieldFilterType.Number => NumberValue,
                FieldFilterType.String => StringValue,
                FieldFilterType.Null => null,
                _ => throw new NotImplementedException()
            });

            return Comparator switch
            {
                Comparator.Equal => Expression.Equal(propertyGetter, value),
                Comparator.GreaterThan => Expression.GreaterThan(propertyGetter, value),
                Comparator.LessThan => Expression.LessThan(propertyGetter, value),
                Comparator.GreaterThanOrEqual => Expression.GreaterThanOrEqual(propertyGetter, value),
                Comparator.LessThanOrEqual => Expression.LessThanOrEqual(propertyGetter, value),
                Comparator.NotEquals => Expression.NotEqual(propertyGetter, value),
                Comparator.Contains => BuildContainsExpression(propertyGetter, value),
                _ => throw new NotImplementedException()
            };
        }

        private static Expression BuildContainsExpression(Expression propertyGetter, Expression value)
        {
            var toLowerMethod = typeof(string).GetMethod("ToLower", BindingFlags.Public | BindingFlags.Instance, new Type[] {});
            if (toLowerMethod == null)
            {
                throw new Exception("Cannot find string.ToLower() method. Maybe it changed names??");
            }

            var containsMethod = typeof(string).GetMethod("Contains", BindingFlags.Public | BindingFlags.Instance, new Type[] {typeof(string)});
            if (containsMethod == null)
            {
                throw new Exception("Cannot find string.Contains() method. Maybe it changed names??");
            }

            var left = Expression.Call(propertyGetter, toLowerMethod);
            var right = Expression.Call(value, toLowerMethod);

            return Expression.Call(left, containsMethod, right);
        }

        public override bool Equals(object? o)
        {
            if (o is not FieldFilter other)
            {
                return false;
            }

            // Optimization for a common success case.
            if (Object.ReferenceEquals(this, other))
            {
                return true;
            }

            // If run-time types are not exactly the same, return false.
            if (this.GetType() != other.GetType())
            {
                return false;
            }

            return this.PropertyName == other.PropertyName &&
                this.Comparator == other.Comparator &&
                this.Type == other.Type &&
                this.StringValue == other.StringValue &&
                this.NumberValue == other.NumberValue;
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(PropertyName, Comparator, Type, StringValue, NumberValue);
        }

        public static bool operator ==(FieldFilter? lhs, FieldFilter? rhs)
        {
            if (lhs is null)
            {
                if (rhs is null)
                {
                    return true;
                }

                // Only the left side is null.
                return false;
            }
            // Equals handles case of null on right side.
            return lhs.Equals(rhs);
        }

        public static bool operator !=(FieldFilter? lhs, FieldFilter? rhs) => !(lhs == rhs);
    }

    public enum Comparator
    {
        Equal,
        LessThan,
        GreaterThan,
        LessThanOrEqual,
        GreaterThanOrEqual,
        NotEquals,
        Contains
    }
}
