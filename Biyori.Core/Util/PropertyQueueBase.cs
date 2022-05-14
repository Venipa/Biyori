using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.Core.Util
{
    public class PropertyQueueBase<T>
	{
		private T _value;
		public event EventHandler<T> ValueChange;
		public T Value
		{
			get { return _value; }
			set { _value = value; ValueChange?.Invoke(this, value); }
		}
		public PropertyQueueBase()
		{
			this._value = default(T);
		}
		public PropertyQueueBase(T initialValue)
		{
			this._value = initialValue;
		}

	}
}
