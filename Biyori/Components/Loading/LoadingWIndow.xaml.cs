using System;
using System.Collections.Generic;
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
    public partial class LoadingWIndow : Window
    {
        public LoadingWIndow()
        {
            InitializeComponent();
        }
        protected override void OnInitialized(EventArgs e)
        {
            base.OnInitialized(e);

            //var languageInstance = Lib.Languages.Languages.Instance();
            //languageInstance.Initialize();

            Dispatcher.BeginInvoke((Action)(() =>
            {
                this.Hide();
                new MainWindow().Show();
                this.Close();
            }));
        }
        private void Grid_PreviewMouseDown(object sender, MouseButtonEventArgs e)
        {
            if (e.ChangedButton == MouseButton.Left)
                this.DragMove();
        }
    }
}
