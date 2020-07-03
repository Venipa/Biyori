using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;

namespace Biyori.Lib.Util
{
    public static class ThreadDispatcher
    {
        public static Thread ThreadDispatch(this DispatcherObject w, Action action)
        {
            var t = new Thread(() =>
            {
                w.Dispatcher.Invoke(action);
            });
            t.SetApartmentState(ApartmentState.STA);
            return t;
        }
        public static AsyncRelayCommand AsyncDispatch(this DispatcherObject w, Action action)
        {
            var asyncCommand = new AsyncRelayCommand(() => Task.Run(action));
            return asyncCommand;
        }
    }
}
