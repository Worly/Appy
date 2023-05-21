using System.Linq.Expressions;

namespace Appy.Services.SmartFiltering
{
    public static class SmartFilterExtensions
    {
        public static IQueryable<T> ApplySmartFilter<T>(this IQueryable<T> queryable, SmartFilter? filter)
        {
            if (filter == null)
                return queryable;

            var parameter = Expression.Parameter(typeof(T));
            var expression = Expression.Lambda<Func<T, bool>>(filter.ToExpression<T>(parameter), parameter);

            return queryable.Where(expression);
        }
    }
}
