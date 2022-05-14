using Biyori.Core.Util;
using Biyori.Services;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Timers;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace Biyori.Components.Loading
{
    /// <summary>
    /// Interaction logic for LoadingWIndow.xaml
    /// </summary>
    public partial class LoadingWindow : Window, INotifyPropertyChanged
    {
        public PropertyQueueBase<string> LoadingStatus { get => App.ServiceProvider.GetProvider<AppService>()?.LoadingStatus; }
        public LoadingWindow()
        {
            InitializeComponent();
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected override void OnInitialized(EventArgs e)
        {
            base.OnInitialized(e);
            this.LoadingStatus.ValueChange += onLoadingStatusChange;

        }
        protected override void OnDeactivated(EventArgs e)
        {
            base.OnDeactivated(e);
            this.LoadingStatus.ValueChange -= this.onLoadingStatusChange;
        }
        private void onLoadingStatusChange(object sender, string e)
        {
            Dispatcher.BeginInvoke((Action)(() =>
            {
                loadingTextElement.Text = e;
            }));
        }

        private void Grid_PreviewMouseDown(object sender, MouseButtonEventArgs e)
        {
            if (e.ChangedButton == MouseButton.Left)
                this.DragMove();
        }
    }
}
