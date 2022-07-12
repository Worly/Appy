namespace Appy.DTOs
{
    public class ErrorBuilder
    {
        public IReadOnlyDictionary<string, string> Errors { get => errors; }

        private Dictionary<string, string> errors = new Dictionary<string, string>();

        public ErrorBuilder Add(string property, string errorCode)
        {
            errors.Add(property, errorCode);
            return this;
        }

        public ErrorBuilder Add(string errorCode)
        {
            errors.Add("other", errorCode);
            return this;
        }
    }
}
