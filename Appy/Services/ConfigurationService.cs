using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using System;
using System.ComponentModel;
using System.Text;

namespace WappChatAnalyzer.Services
{
    public interface IConfigurationService
    {
        public T Get<T>(string section);
    }

    public class ConfigurationService : IConfigurationService
    {
        private IConfiguration configuration;
        private IWebHostEnvironment webHostEnvironment;

        public ConfigurationService(IConfiguration configuration, IWebHostEnvironment webHostEnvironment)
        {
            this.configuration = configuration;
            this.webHostEnvironment = webHostEnvironment;
        }

        public T Get<T>(string section)
        {
            if (webHostEnvironment.IsProduction())
                return GetFromEnv<T>(section);
            else
                return GetFromAppSettings<T>(section);
        }

        public T GetFromEnv<T>(string section)
        {
            section = CamelCaseToUpperSnakeCase(section);

            if (typeof(T) == typeof(string))
            {
                var value = Environment.GetEnvironmentVariable(section);
                if (value == null)
                    throw new ArgumentNullException(section);

                return (T)TypeDescriptor.GetConverter(typeof(T)).ConvertFromString(value);
            }
            if (typeof(T).IsPrimitive)
            {
                var value = Environment.GetEnvironmentVariable(section);
                if (value == null)
                    throw new ArgumentNullException(section);

                return (T)TypeDescriptor.GetConverter(typeof(T)).ConvertFromString(value);
            }
            else
            {
                var result = Activator.CreateInstance<T>();

                foreach (var prop in typeof(T).GetProperties())
                {
                    var name = section + "_" + CamelCaseToUpperSnakeCase(prop.Name);

                    var value = Environment.GetEnvironmentVariable(name);
                    if (value == null)
                        throw new ArgumentNullException(name);

                    prop.SetValue(result, TypeDescriptor.GetConverter(prop.PropertyType).ConvertFromString(value));
                }

                return result;
            }

        }

        public T GetFromAppSettings<T>(string section)
        {
            var value = configuration.GetSection(section).Get<T>();
            if (value == null)
                throw new ArgumentNullException(section);

            return value;
        }

        private string CamelCaseToUpperSnakeCase(string text)
        {
            if (text == null)
                throw new ArgumentNullException(nameof(text));

            if (text.Length < 2)
                return text.ToUpper();

            var sb = new StringBuilder();
            sb.Append(char.ToLower(text[0]));
            for (int i = 1; i < text.Length; ++i)
            {
                char c = text[i];
                if (char.IsUpper(c))
                {
                    sb.Append('_');
                    sb.Append(char.ToLower(c));
                }
                else
                {
                    sb.Append(c);
                }
            }
            return sb.ToString().ToUpper();
        }
    }
}
