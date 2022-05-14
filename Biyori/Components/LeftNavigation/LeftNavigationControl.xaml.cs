using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace Biyori.Components.LeftNavigation
{
    /// <summary>
    /// Interaction logic for LeftNavigationControl.xaml
    /// </summary>
    public partial class LeftNavigationControl : UserControl, INotifyPropertyChanged
    {
        public IEnumerable<LeftNavTab> Tabs
        {
            get { return (IEnumerable<LeftNavTab>)GetValue(SelectedTabProperty); }
            set
            {
                SetValue(TabsProperty, value);
                this.TabsChange?.Invoke(this, value);
                this.PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("Tabs"));
            }
        }
        public static readonly DependencyProperty TabsProperty =
            DependencyProperty.Register("Tabs", typeof(IEnumerable<LeftNavTab>), typeof(LeftNavigationControl), new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault));
        public LeftNavTab SelectedTab
        {
            get { return (LeftNavTab)GetValue(SelectedTabProperty); }
            set { SetValue(SelectedTabProperty, value);
                this.SelectedTabChange?.Invoke(this, value);
                this.PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("SelectedTab")); }
        }

        // Using a DependencyProperty as the backing store for SelectedTab.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty SelectedTabProperty =
            DependencyProperty.Register("SelectedTab", typeof(LeftNavTab), typeof(LeftNavigationControl), new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault));

        public event EventHandler<LeftNavTab> SelectedTabChange;
        public event EventHandler<IEnumerable<LeftNavTab>> TabsChange;

        public LeftNavigationControl()
        {
            InitializeComponent();
        }
        protected override void OnRender(DrawingContext drawingContext)
        {
            base.OnRender(drawingContext);
            this.PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("SelectedTab"));
            this.PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("Tabs"));
        }

        public event PropertyChangedEventHandler PropertyChanged;
    }
    public class LeftNavTab
    {
        public string Name { get; set; }
    }
}
