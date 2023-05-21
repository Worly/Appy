using System.Linq.Expressions;

namespace Appy.Services.SmartFilter
{
    public static class SmartFilterExtensions
    {
        public static IQueryable<T> ApplySmartFilter<T>(this IQueryable<T> queriable, SmartFilter filter)
        {
            var parameter = Expression.Parameter(typeof(T));
            var expression = Expression.Lambda<Func<T, bool>>(filter.ToExpression<T>(parameter), parameter);

            return queriable.Where(expression);
        }
    }
}
